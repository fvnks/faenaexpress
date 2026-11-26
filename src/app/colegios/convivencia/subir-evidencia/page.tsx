import { redirect } from "next/navigation";

import { requireSchoolContext } from "@/lib/school-auth";
import { schoolCanWrite } from "@/lib/school-auth";

import { UploadEvidenceForm } from "./upload-evidence-form";

export default async function SubirEvidenciaPage() {
  const ctx = await requireSchoolContext("convivencia");
  if (!schoolCanWrite(ctx, "convivencia")) redirect("/colegios/convivencia");
  return <UploadEvidenceForm />;
}
