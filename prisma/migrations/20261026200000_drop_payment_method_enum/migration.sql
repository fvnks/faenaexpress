-- DropEnum
DROP TYPE "PaymentMethod";

-- Se siembran las formas de pago base en el catálogo de cada empresa: el
-- catálogo es la lista que la empresa administra en Catálogos y de la que salen
-- las opciones al marcar un documento como pagado. Antes estas formas eran un
-- enum fijo que no se podía ampliar.
INSERT INTO "PaymentMethodCatalog" ("id", "companyId", "name", "active", "createdAt", "updatedAt")
SELECT
  md5(c."id" || '-' || m.name),
  c."id",
  m.name,
  true,
  now(),
  now()
FROM "Company" c
CROSS JOIN (VALUES
  ('Efectivo'),
  ('Transferencia'),
  ('Tarjeta de crédito'),
  ('Tarjeta de débito'),
  ('Cheque'),
  ('Otro')
) AS m(name)
WHERE NOT EXISTS (
  SELECT 1 FROM "PaymentMethodCatalog" p
  WHERE p."companyId" = c."id" AND lower(p."name") = lower(m.name)
);
