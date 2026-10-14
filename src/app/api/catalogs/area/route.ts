import { createArea } from "@/app/actions/catalogs";
import { requireContext } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const ctx = await requireContext();
  const formData = await request.formData();

  const result = await createArea(undefined, formData);

  if (!result) {
    return Response.json({ error: "Error desconocido" }, { status: 500 });
  }
  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  if (result.ok) {
    const areas = await db.area.findMany({
      where: {companyId: ctx.company.id},
      orderBy: {createdAt: "desc"},
      take: 1,
      select: {id: true},
    });
    return Response.json({ok: true, id: areas[0]?.id});
  }

  return Response.json({error: "Error desconocido"}, {status: 500});
}