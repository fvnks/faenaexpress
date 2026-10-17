-- Credenciales de Defontana por empresa: permiten traer a pedido el XML de una
-- factura desde el Libro de Compras del ERP. La clave y el token de sesión se
-- guardan cifrados (AES-256-GCM), así que aquí solo se agregan las columnas.
ALTER TABLE "Company" ADD COLUMN "defontanaEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN "defontanaClaveEnc" TEXT;
ALTER TABLE "Company" ADD COLUMN "defontanaTokenEnc" TEXT;
ALTER TABLE "Company" ADD COLUMN "defontanaTokenExp" TIMESTAMP(3);
