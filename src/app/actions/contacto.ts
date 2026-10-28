"use server";

import { z } from "zod";

const contactoSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Ingresa un correo válido."),
  empresa: z.string().min(1, "Indica el nombre de tu empresa."),
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres."),
});

export type ContactoState = {
  error?: string;
  ok?: boolean;
  fields?: {
    nombre?: string;
    email?: string;
    empresa?: string;
    mensaje?: string;
  };
};

export async function enviarContacto(
  formData: FormData,
): Promise<ContactoState> {
  const raw = {
    nombre: String(formData.get("nombre") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    empresa: String(formData.get("empresa") ?? "").trim(),
    mensaje: String(formData.get("mensaje") ?? "").trim(),
  };

  const parsed = contactoSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { error: first, fields: raw };
  }

  // En una instalación real aquí se enviaría el correo o se guardaría la consulta.
  // Por ahora registramos la intención de contacto y respondemos con éxito.
  console.log("Nueva consulta de contacto:", parsed.data);

  return { ok: true };
}

/**
 * Wrapper para usar como action nativa de <form> en Next.js.
 * Next.js requiere que la función pasada a action retorne void | Promise<void>.
 */
export async function submitContacto(formData: FormData): Promise<void> {
  await enviarContacto(formData);
}
