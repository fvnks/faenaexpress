-- Multiempresa: cada empresa aísla sus datos y cada usuario tiene un rol por
-- empresa (Membership). Los datos existentes se asignan a la empresa actual.

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_companyId_idx" ON "Membership"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_companyId_key" ON "Membership"("userId", "companyId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Datos existentes: si no hay ninguna empresa, se crea una por defecto.
INSERT INTO "Company" ("id", "name", "updatedAt")
SELECT 'cmp_' || md5(random()::text || clock_timestamp()::text), 'Mi Empresa', now()
WHERE NOT EXISTS (SELECT 1 FROM "Company");

-- AlterTable: columnas nuevas como nullables para poder rellenarlas.
ALTER TABLE "Area" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Category" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Partner" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Payer" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Salesperson" ADD COLUMN "companyId" TEXT;

-- Backfill: todo lo existente pertenece a la empresa actual (la primera).
UPDATE "Area"        SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;
UPDATE "Category"    SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;
UPDATE "Expense"     SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;
UPDATE "Partner"     SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;
UPDATE "Payer"       SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;
UPDATE "Purchase"    SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;
UPDATE "Sale"        SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;
UPDATE "Salesperson" SET "companyId" = (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) WHERE "companyId" IS NULL;

-- Cada usuario existente pasa a ser miembro de la empresa con su rol actual.
INSERT INTO "Membership" ("id", "userId", "companyId", "role", "active", "createdAt", "updatedAt")
SELECT
    'mem_' || md5(random()::text || clock_timestamp()::text),
    u."id",
    c."id",
    u."role",
    true,
    now(),
    now()
FROM "User" u
CROSS JOIN LATERAL (SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1) c
WHERE NOT EXISTS (
    SELECT 1 FROM "Membership" m WHERE m."userId" = u."id" AND m."companyId" = c."id"
);

-- AlterTable: ahora sí obligatorias.
ALTER TABLE "Area"        ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Category"    ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Expense"     ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Partner"     ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Payer"       ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Purchase"    ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Sale"        ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Salesperson" ALTER COLUMN "companyId" SET NOT NULL;

-- El rol deja de vivir en el usuario (ahora es por empresa).
ALTER TABLE "User" DROP COLUMN "role";

-- Category.description no se usa.
ALTER TABLE "Category" DROP COLUMN "description";

-- DropIndex
DROP INDEX "Area_name_key";
DROP INDEX "Category_name_key";
DROP INDEX "Expense_areaId_idx";
DROP INDEX "Expense_categoryId_idx";
DROP INDEX "Expense_date_idx";
DROP INDEX "Expense_paidById_idx";
DROP INDEX "Partner_name_idx";
DROP INDEX "Partner_rut_key";
DROP INDEX "Payer_name_key";
DROP INDEX "Purchase_areaId_idx";
DROP INDEX "Purchase_date_idx";
DROP INDEX "Purchase_partnerId_idx";
DROP INDEX "Purchase_status_idx";
DROP INDEX "Sale_areaId_idx";
DROP INDEX "Sale_date_idx";
DROP INDEX "Sale_partnerId_idx";
DROP INDEX "Sale_salespersonId_idx";
DROP INDEX "Salesperson_name_key";

-- CreateIndex
CREATE INDEX "Area_companyId_idx" ON "Area"("companyId");
CREATE UNIQUE INDEX "Area_companyId_name_key" ON "Area"("companyId", "name");
CREATE INDEX "Category_companyId_idx" ON "Category"("companyId");
CREATE UNIQUE INDEX "Category_companyId_name_key" ON "Category"("companyId", "name");
CREATE INDEX "Expense_companyId_date_idx" ON "Expense"("companyId", "date");
CREATE INDEX "Expense_companyId_paidById_idx" ON "Expense"("companyId", "paidById");
CREATE INDEX "Expense_companyId_categoryId_idx" ON "Expense"("companyId", "categoryId");
CREATE INDEX "Expense_companyId_areaId_idx" ON "Expense"("companyId", "areaId");
CREATE INDEX "Partner_companyId_name_idx" ON "Partner"("companyId", "name");
CREATE UNIQUE INDEX "Partner_companyId_rut_key" ON "Partner"("companyId", "rut");
CREATE INDEX "Payer_companyId_idx" ON "Payer"("companyId");
CREATE UNIQUE INDEX "Payer_companyId_name_key" ON "Payer"("companyId", "name");
CREATE INDEX "Purchase_companyId_date_idx" ON "Purchase"("companyId", "date");
CREATE INDEX "Purchase_companyId_partnerId_idx" ON "Purchase"("companyId", "partnerId");
CREATE INDEX "Purchase_companyId_status_idx" ON "Purchase"("companyId", "status");
CREATE INDEX "Purchase_companyId_categoryId_idx" ON "Purchase"("companyId", "categoryId");
CREATE INDEX "Purchase_companyId_areaId_idx" ON "Purchase"("companyId", "areaId");
CREATE INDEX "Sale_companyId_date_idx" ON "Sale"("companyId", "date");
CREATE INDEX "Sale_companyId_partnerId_idx" ON "Sale"("companyId", "partnerId");
CREATE INDEX "Sale_companyId_status_idx" ON "Sale"("companyId", "status");
CREATE INDEX "Sale_companyId_categoryId_idx" ON "Sale"("companyId", "categoryId");
CREATE INDEX "Sale_companyId_areaId_idx" ON "Sale"("companyId", "areaId");
CREATE INDEX "Sale_companyId_salespersonId_idx" ON "Sale"("companyId", "salespersonId");
CREATE INDEX "Salesperson_companyId_idx" ON "Salesperson"("companyId");
CREATE UNIQUE INDEX "Salesperson_companyId_name_key" ON "Salesperson"("companyId", "name");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Area" ADD CONSTRAINT "Area_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Salesperson" ADD CONSTRAINT "Salesperson_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payer" ADD CONSTRAINT "Payer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
