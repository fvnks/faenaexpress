-- Un abono pertenece a un solo documento (o compra o venta, nunca ambas ni
-- ninguna) y siempre es un monto positivo. La aplicación ya lo cumple; esto lo
-- garantiza también en la base.
ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_document_xor"
    CHECK ((("purchaseId" IS NOT NULL)::int + ("saleId" IS NOT NULL)::int) = 1);

ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_amount_positive"
    CHECK ("amount" > 0);
