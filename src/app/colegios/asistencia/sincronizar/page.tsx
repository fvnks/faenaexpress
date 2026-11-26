import { requireSchoolContext } from "@/lib/school-auth";

import { AsistenciaSyncClient } from "./sync-client";

export default async function AsistenciaSyncPage() {
  await requireSchoolContext("asistencia");
  return <AsistenciaSyncClient />;
}
