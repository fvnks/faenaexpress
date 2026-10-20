-- La siembra de las formas base duplicó, en las empresas que ya tenían su
-- propia versión de la misma forma con otro acento o mayúscula (por ejemplo
-- "Tarjeta de Credito" junto a "Tarjeta de crédito"). Aquí se deja la que la
-- empresa ya tenía y se re-mapean los documentos a esa variante, para que no
-- queden dos formas parecidas en el catálogo ni dos nombres distintos con el
-- mismo documento.
--
-- Se identifican las filas sembradas por su id (md5 de empresa + nombre), así
-- que solo se tocan esas: las que ya tenía la empresa no se borran.

CREATE TEMP TABLE _pm_definitivas AS
SELECT DISTINCT ON (p."companyId", translate(lower(p.name), 'áéíóú', 'aeiou'))
  p.id AS id_sembrada,
  p."companyId" AS company_id,
  p.name AS nombre_sembrada,
  q.name AS nombre_definitivo
FROM "PaymentMethodCatalog" p
JOIN "PaymentMethodCatalog" q
  ON q."companyId" = p."companyId"
 AND q.id <> p.id
 -- La que se conserva es la que la empresa ya tenía, no la sembrada.
 AND q.id <> md5(q."companyId" || '-' || q.name)
 AND translate(lower(p.name), 'áéíóú', 'aeiou') = translate(lower(q.name), 'áéíóú', 'aeiou')
WHERE p.id = md5(p."companyId" || '-' || p.name)
ORDER BY p."companyId", translate(lower(p.name), 'áéíóú', 'aeiou'), q.name;

UPDATE "Purchase" p
SET "paymentMethod" = d.nombre_definitivo
FROM _pm_definitivas d
WHERE p."companyId" = d.company_id AND p."paymentMethod" = d.nombre_sembrada;

UPDATE "Sale" p
SET "paymentMethod" = d.nombre_definitivo
FROM _pm_definitivas d
WHERE p."companyId" = d.company_id AND p."paymentMethod" = d.nombre_sembrada;

UPDATE "Expense" p
SET "paymentMethod" = d.nombre_definitivo
FROM _pm_definitivas d
WHERE p."companyId" = d.company_id AND p."paymentMethod" = d.nombre_sembrada;

UPDATE "Payment" p
SET "method" = d.nombre_definitivo
FROM _pm_definitivas d
WHERE p."companyId" = d.company_id AND p."method" = d.nombre_sembrada;

DELETE FROM "PaymentMethodCatalog" p
USING _pm_definitivas d
WHERE p.id = d.id_sembrada;

DROP TABLE _pm_definitivas;
