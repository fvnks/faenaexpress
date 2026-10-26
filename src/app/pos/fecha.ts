const dateTime = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const time = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  hour: "2-digit",
  minute: "2-digit",
});

/** Fecha y hora de un ticket, en la zona de Chile. */
export function formatPosDateTime(date: Date): string {
  if (!date || Number.isNaN(date.getTime())) return "—";
  return dateTime.format(date);
}

export function formatPosTime(date: Date): string {
  if (!date || Number.isNaN(date.getTime())) return "—";
  return time.format(date);
}
