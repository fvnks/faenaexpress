"use server";

/** Consume el mensaje flash (lo llama el host de toasts tras mostrarlo). */
export async function clearFlash(): Promise<void> {
  // No-op - flash is managed in memory and consumed by getFlash()
}
