import JSZip from "jszip";

import { requireSchoolContext, schoolCanWrite } from "@/lib/school-auth";
import { buildEdePayload } from "@/lib/school-ede";

// Genera el `json.zip` con los contenidos mínimos del libro de clases digital.
//
// Es el archivo que el MINEDUC espera: su contenedor (`edemineduc/etl`) lo
// transforma en CSV, lo carga en una base cifrada y lo valida contra el
// Estándar de Datos para la Educación.
//
//   docker run -it --rm --name etl -v <carpeta>:/usr/src/ede -w /usr/src/ede \
//     edemineduc/etl python3 parseCSVtoEDE.py parse json ./json.zip
//   docker run -it --rm --name etl -v <carpeta>:/usr/src/ede -w /usr/src/ede \
//     edemineduc/etl python3 parseCSVtoEDE.py insert
//   docker run -it --rm --name etl -v <carpeta>:/usr/src/ede -w /usr/src/ede \
//     edemineduc/etl python3 parseCSVtoEDE.py check {frase_secreta} ./file.db
export async function GET() {
  const ctx = await requireSchoolContext("libro");
  if (!schoolCanWrite(ctx, "libro")) {
    return new Response("Tu rol no puede exportar el libro de clases.", { status: 403 });
  }

  const payload = await buildEdePayload(ctx.school.id);

  const zip = new JSZip();
  // El contenedor descomprime el zip y lee cada archivo como un JSON.
  zip.file("ede.json", JSON.stringify(payload, null, 2));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const slug = ctx.school.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="libro-clases-${slug}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
