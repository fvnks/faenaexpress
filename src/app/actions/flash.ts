"use server";

import { cookies } from "next/headers";

import { FLASH_COOKIE_NAME } from "@/lib/flash";

/** Consume el mensaje flash (lo llama el host de toasts tras mostrarlo). */
export async function clearFlash(): Promise<void> {
  const store = await cookies();
  store.delete(FLASH_COOKIE_NAME);
}
