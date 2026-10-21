import {db} from "@/lib/db";
import {computeCommission} from "@/lib/commissions";
(async()=>{
  const report = await computeCommission("cmd123", "2026-09"); // guess company id
  console.log(report.lines.slice(0,5));
  console.log(report.totals);
  await db.$disconnect();
})();
