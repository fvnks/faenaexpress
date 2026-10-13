// Chile, pesos sin decimales en pantalla.
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function formatCLP(amount: number | string | { toString(): string }): string {
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  // Un -0 (una NC con neto 0, o una comisión con tasa 0) se imprimiría "$-0".
  const safe = Number.isFinite(value) && Object.is(value, -0) ? 0 : value;
  return clp.format(safe);
}

export function toNumber(amount: number | string | { toString(): string }): number {
  return typeof amount === "number" ? amount : Number(amount.toString());
}

// Las fechas del dominio son días de calendario. Se guardan a medianoche UTC y
// se formatean en UTC para que no se corran un día en Chile (UTC-3/-4).
export const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayISO(timeZone = "America/Santiago"): string {
  // en-CA produce YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// IVA y total se calculan siempre en el servidor con el mismo redondeo que
// muestra el formulario: pesos enteros.
export function computeIva(net: number, ivaRate: number): number {
  return Math.round((net * ivaRate) / 100);
}

export function computeTotal(net: number, iva: number): number {
  return net + iva;
}

// Las notas de crédito restan en los reportes; el monto se guarda positivo.
export function documentSign(documentType: string): 1 | -1 {
  return documentType === "CREDIT_NOTE" ? -1 : 1;
}

// Primer día del mes (UTC) y primer día del mes siguiente, para los períodos.
export function monthRange(period: string): { from: Date; to: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  return { from, to };
}

export function currentPeriod(timeZone = "America/Santiago"): string {
  return todayISO(timeZone).slice(0, 7);
}

export function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${months[Number(match[2]) - 1]} ${match[1]}`;
}

export function shiftPeriod(period: string, deltaMonths: number): string {
  const range = monthRange(period);
  const base = range ? range.from : new Date();
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + deltaMonths, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function daysBetween(from: Date, to: Date): number {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / MS);
}

// Fecha en UTC a medianoche de hoy, según la zona de Chile.
export function todayDate(timeZone = "America/Santiago"): Date {
  return new Date(`${todayISO(timeZone)}T00:00:00.000Z`);
}
