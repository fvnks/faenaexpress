-- Conciliación bancaria de gastos: el movimiento bancario con que se cerró el
-- gasto, es decir el reembolso a quien puso la plata. Un movimiento sigue
-- conciliando con un solo documento (movementId es único); el gasto es la
-- tercera contraparte posible, junto a la compra y a la venta.
ALTER TABLE "Reconciliation" ADD COLUMN IF NOT EXISTS "expenseId" TEXT;

CREATE INDEX IF NOT EXISTS "Reconciliation_expenseId_idx" ON "Reconciliation"("expenseId");

DO $$
BEGIN
  ALTER TABLE "Reconciliation"
    ADD CONSTRAINT "Reconciliation_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "Expense"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
