// Implementación con base de datos de las reglas de firma del libro de clases.
//
// Las reglas puras están en `school-sign-rules.ts` para que Client Components
// y Server Actions puedan usarlas sin traer `db`.

import type { SchoolRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatRut, normalizeRut } from "@/lib/rut";
import {
  puedeFirmarSesion,
  firmaCuadra,
  type FirmaExportable,
  type FirmaVisible,
  runFirmante,
} from "@/lib/school-sign-rules";

/**
 * Borra las firmas de unas sesiones.
 *
 * Se llama desde todo lo que reescribe una sesión o su asistencia: si el
 * registro cambia, la firma deja de ser cierta.
 */
export async function invalidarFirmas(sessionIds: string[]): Promise<void> {
  if (sessionIds.length === 0) return;
  await db.schoolSignature.deleteMany({ where: { sessionId: { in: sessionIds } } });
}

/** Las firmas de un colegio, por sesión. Para el exportador del EDE. */
export async function firmasDeColegio(schoolId: string): Promise<Map<string, FirmaExportable>> {
  const firmas = await db.schoolSignature.findMany({
    where: { schoolId },
    orderBy: { verifiedAt: "asc" },
  });
  return new Map(
    firmas.map((f) => [
      f.sessionId,
      {
        sessionId: f.sessionId,
        otp: f.otp,
        verificadoEn: f.verifiedAt,
        firmadoPorId: f.signedById,
        firmadoPor: f.signerName,
        runFirmante: f.signerRut,
        asistencias: f.attendances,
      },
    ]),
  );
}

/** La firma de una sesión, si está vigente. Para la pantalla. */
export async function firmaDeSesion(
  sessionId: string,
  asistenciasDeLaSesion: number,
): Promise<FirmaVisible | null> {
  const firma = await db.schoolSignature.findUnique({ where: { sessionId } });
  if (!firma || !firmaCuadra({ id: firma.id, attendances: firma.attendances }, asistenciasDeLaSesion)) return null;

  return {
    id: firma.id,
    sessionId: firma.sessionId,
    otp: firma.otp,
    verificadoEn: firma.verifiedAt,
    firmadoPorId: firma.signedById,
    firmadoPor: firma.signerName,
    runFirmante: firma.signerRut,
    asistencias: firma.attendances,
  };
}

/**
 * Cuántas clases del colegio están firmadas.
 *
 * El panel del libro lo usa para decir al colegio qué tanto está listo para la
 * fiscalización; una clase sin firmar es una clase que el MINEDUC puede
 * cuestionar, aunque el registro exista.
 */
export async function estadoDeFirmas(schoolId: string): Promise<{
  sesiones: number;
  firmadas: number;
  pendientes: number;
  ultimaFirma: Date | null;
}> {
  const [sesiones, firmadas, ultima] = await Promise.all([
    db.classSession.count({ where: { schoolId } }),
    db.schoolSignature.count({ where: { schoolId } }),
    db.schoolSignature.findFirst({
      where: { schoolId },
      orderBy: { verifiedAt: "desc" },
      select: { verifiedAt: true },
    }),
  ]);
  return { sesiones, firmadas, pendientes: Math.max(0, sesiones - firmadas), ultimaFirma: ultima?.verifiedAt ?? null };
}
