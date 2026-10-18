-- Por qué un movimiento bancario salió de la bandeja sin conciliarse:
-- internal_transfer (traspaso entre cuentas propias, no es cobro ni pago) o
-- noise (descartado a mano). Los movimientos ya ignorados quedan como noise.
ALTER TABLE "BankMovement" ADD COLUMN IF NOT EXISTS "ignoredReason" TEXT;
