-- El schema no declara índice sobre Partner(companyId, salespersonId): ese dato solo
-- guarda el vendedor por defecto de un cliente y nunca se filtra por él. La migración
-- 20261018120000 lo creó de más y quedó huérfano en las bases que ya existían.
-- IF EXISTS para que también sea inocuo desde el baseline (donde nunca existió).
DROP INDEX IF EXISTS "Partner_salespersonId_idx";
DROP INDEX IF EXISTS "Partner_companyId_salespersonId_idx";
