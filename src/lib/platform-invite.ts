// El enlace de una invitación generada en la consola tiene que sobrevivir a la
// revalidación: la acción revalida la página y el componente de cliente se
// monta de nuevo, perdiendo el estado. Por eso el enlace se guarda en una
// cookie corta y la página lo pinta en el servidor.
//
// El token NO se guarda en la base (solo su hash); aquí viaja en claro en la
// cookie del navegador de quien lo generó, que es quien lo tiene que repartir.

import { cookies } from "next/headers";

const INVITE_COOKIE = "facturas_admin_invite";
const TTL_S = 15 * 60; // 15 minutos: tiempo de sobra para mandarlo.

export type PendingInvite = {
  id: string;
  url: string;
  email: string;
  organizationId: string;
};

export async function setPendingInvite(invite: PendingInvite): Promise<void> {
  const store = await cookies();
  store.set(INVITE_COOKIE, JSON.stringify(invite), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_S,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getPendingInvite(): Promise<PendingInvite | null> {
  const store = await cookies();
  const raw = store.get(INVITE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingInvite;
    if (!parsed?.id || !parsed.url) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingInvite(): Promise<void> {
  const store = await cookies();
  store.delete(INVITE_COOKIE);
}
