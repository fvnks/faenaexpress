"use server";

// Firmar una sesión de clase con el verificador de identidad del MINEDUC.
//
// El docente presenta el código de su autenticador; el MINEDUC lo valida contra
// su RUN y, si confirma, esa sesión queda firmada. El código es la
// `digitalRandomKey` que el EDE exige en cada fila de asistencia.
//
// Falla cerrado en todos lados: sin confirmación del MINEDUC no hay firma, y
// quien no tiene permiso no firma nada (las acciones de Next son alcanzables
// por POST directo, no solo desde la pantalla).

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { normalizeRut, isValidRut } from "@/lib/rut";
import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { firmaDeSesion } from "@/lib/school-signatures";
import { puedeFirmarSesion } from "@/lib/school-sign-rules";
import { verificarCodigoVerificador } from "@/lib/school-verifier";

export type FirmaFormState =
  | {
      error?: string;
      ok?: boolean;
      firmadoPor?: string;
      runFirmante?: string;
      verificadoEn?: string;
    }
  | undefined;

/** Anula una firma vigente: la sesión vuelve a quedar pendiente. */
export async function anularFirmaAction(
  _prev: FirmaFormState,
  formData: FormData,
): Promise<FirmaFormState> {
  const ctx = await requireSchoolContext("libro");
  // Anular es decisión de la dirección o la UTP: el docente no deshace su
  // propia firma desde acá, eso se arregla reescribiendo el registro.
  if (ctx.role !== "DIRECTOR" && ctx.role !== "UTP") {
    return { error: "Solo la dirección o la UTP pueden anular una firma." };
  }

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) return { error: "Falta la clase." };

  const borrada = await db.schoolSignature.deleteMany({
    where: { sessionId, schoolId: ctx.school.id },
  });
  if (borrada.count === 0) return { error: "Esa clase no tenía firma." };

  revalidatePath("/colegios/asistencia");
  revalidatePath("/colegios/libro");
  return { ok: true };
}

export async function firmarSesionAction(
  _prev: FirmaFormState,
  formData: FormData,
): Promise<FirmaFormState> {
  const ctx = await requireSchoolContext("libro");
  if (!schoolCanWrite(ctx, "libro")) {
    return { error: "Tu rol no permite firmar el libro de clases." };
  }

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) return { error: "Falta la clase." };

  const sesion = await db.classSession.findFirst({
    where: { id: sessionId, schoolId: ctx.school.id },
    select: {
      id: true,
      recordedById: true,
      _count: { select: { attendances: true } },
    },
  });
  if (!sesion) return { error: "Esa clase no es de este colegio." };

  const autorizado = puedeFirmarSesion(ctx.role, ctx.user.id, sesion.recordedById);
  if (!autorizado.ok) return { error: autorizado.mensaje };

  // El RUN: el que trae la cuenta, o el que se ingrese ahora. Si el MINEDUC lo
  // valida, queda guardado: la próxima firma no lo vuelve a pedir.
  const rutIngresado = String(formData.get("rut") ?? "").trim();
  const rut = normalizeRut(rutIngresado || ctx.user.rut || "");
  if (!isValidRut(rut)) {
    return { error: "Falta el RUN de quien firma. Es el que tiene su verificador de identidad en tramites.mineduc.cl." };
  }

  const codigo = String(formData.get("codigo") ?? "").trim();
  const verificacion = await verificarCodigoVerificador(rut, codigo);
  if (!verificacion.ok) return { error: verificacion.mensaje };

  const verificadoEn = verificacion.verificadoEn;
  const asistencias = sesion._count.attendances;

  await db.$transaction([
    // Reemplaza la firma anterior: una sesión tiene una firma a la vez, y si
    // alguien la volvió a firmar es porque la anterior ya no servía.
    db.schoolSignature.deleteMany({ where: { sessionId } }),
    db.schoolSignature.create({
      data: {
        schoolId: ctx.school.id,
        sessionId,
        signedById: ctx.user.id,
        signerName: ctx.user.name,
        signerRut: verificacion.rut,
        otp: verificacion.codigo,
        verifiedAt: verificadoEn,
        attendances: asistencias,
      },
    }),
    // El RUN recién validado por el MINEDUC queda en la cuenta.
    ...(ctx.user.rut
      ? []
      : [
          db.user.update({
            where: { id: ctx.user.id },
            data: { rut: verificacion.rut },
          }),
        ]),
  ]);

  const existente = await firmaDeSesion(sessionId, asistencias);
  revalidatePath("/colegios/asistencia");
  revalidatePath("/colegios/libro");

  return {
    ok: true,
    firmadoPor: existente?.firmadoPor ?? ctx.user.name,
    runFirmante: existente?.runFirmante ?? verificacion.rut,
    verificadoEn: verificadoEn.toISOString(),
  };
}
