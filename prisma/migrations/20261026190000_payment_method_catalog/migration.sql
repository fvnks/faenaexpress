-- El medio de pago pasa a ser el NOMBRE del catálogo de la empresa (PaymentMethodCatalog)
-- en vez de un enum fijo. Cada empresa tiene las formas de pago que necesita (la tarjeta
-- de un banco, un vale, una transferencia a una cuenta concreta) y el enum las limitaba.
--
-- Los valores que ya existían se convierten a su nombre legible, para que no se rompa
-- nada de lo ya registrado.
ALTER TABLE "Purchase" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "Purchase" ALTER COLUMN "paymentMethod" TYPE TEXT;
UPDATE "Purchase" SET "paymentMethod" = CASE "paymentMethod"
  WHEN 'CASH' THEN 'Efectivo'
  WHEN 'TRANSFER' THEN 'Transferencia'
  WHEN 'CREDIT_CARD' THEN 'Tarjeta de crédito'
  WHEN 'DEBIT_CARD' THEN 'Tarjeta de débito'
  WHEN 'CHECK' THEN 'Cheque'
  WHEN 'OTHER' THEN 'Otro'
  ELSE "paymentMethod" END
WHERE "paymentMethod" IS NOT NULL;

ALTER TABLE "Sale" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "Sale" ALTER COLUMN "paymentMethod" TYPE TEXT;
UPDATE "Sale" SET "paymentMethod" = CASE "paymentMethod"
  WHEN 'CASH' THEN 'Efectivo'
  WHEN 'TRANSFER' THEN 'Transferencia'
  WHEN 'CREDIT_CARD' THEN 'Tarjeta de crédito'
  WHEN 'DEBIT_CARD' THEN 'Tarjeta de débito'
  WHEN 'CHECK' THEN 'Cheque'
  WHEN 'OTHER' THEN 'Otro'
  ELSE "paymentMethod" END
WHERE "paymentMethod" IS NOT NULL;

ALTER TABLE "Payment" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "method" TYPE TEXT;
UPDATE "Payment" SET "method" = CASE "method"
  WHEN 'CASH' THEN 'Efectivo'
  WHEN 'TRANSFER' THEN 'Transferencia'
  WHEN 'CREDIT_CARD' THEN 'Tarjeta de crédito'
  WHEN 'DEBIT_CARD' THEN 'Tarjeta de débito'
  WHEN 'CHECK' THEN 'Cheque'
  WHEN 'OTHER' THEN 'Otro'
  ELSE "method" END
WHERE "method" IS NOT NULL;

ALTER TABLE "Expense" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "Expense" ALTER COLUMN "paymentMethod" TYPE TEXT;
ALTER TABLE "Expense" ALTER COLUMN "paymentMethod" SET DEFAULT 'Efectivo';
UPDATE "Expense" SET "paymentMethod" = CASE "paymentMethod"
  WHEN 'CASH' THEN 'Efectivo'
  WHEN 'TRANSFER' THEN 'Transferencia'
  WHEN 'CREDIT_CARD' THEN 'Tarjeta de crédito'
  WHEN 'DEBIT_CARD' THEN 'Tarjeta de débito'
  WHEN 'CHECK' THEN 'Cheque'
  WHEN 'OTHER' THEN 'Otro'
  ELSE "paymentMethod" END;
