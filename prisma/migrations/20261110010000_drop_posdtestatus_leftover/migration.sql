-- El enum "PosDteStatus" quedó sin uso: la migración que lo creó
-- (20261102000000_pos_sii_config) lo dejó como tipo de la columna "estado",
-- pero después esa columna pasó a ser texto y el enum quedó huérfano
-- (ninguna columna lo usa).
--
-- El schema nunca lo declaró, así que la base estaba ahead del schema por
-- esta sobra: `pnpm db:drift` no podía dar 0. Se elimina el tipo.
DROP TYPE "PosDteStatus";
