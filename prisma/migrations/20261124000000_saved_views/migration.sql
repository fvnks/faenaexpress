-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_companyId_userId_section_name_key" ON "SavedView"("companyId", "userId", "section", "name");

-- CreateIndex
CREATE INDEX "SavedView_companyId_userId_section_idx" ON "SavedView"("companyId", "userId", "section");

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
