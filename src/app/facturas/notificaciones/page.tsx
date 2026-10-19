import { readAllNotifications, readNotification } from "@/app/actions/notifications";
import { Alert, type AlertVariant } from "@/components/alert";
import { requireContext } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { secondaryButtonClass } from "@/lib/ui";
import type { NotificationType } from "@/generated/prisma/client";

// Mapea el tipo de notificación a la variante de alerta.
function alertVariant(type: NotificationType, read: boolean): AlertVariant {
  if (read) return "info";
  if (type === "PURCHASE_OVERDUE" || type === "SALE_OVERDUE") return "destructive";
  if (type === "PURCHASE_DUE_SOON" || type === "SALE_DUE_SOON") return "warning";
  return "info";
}

export default async function NotificationsPage() {
  const ctx = await requireContext();
  const notifications = await listNotifications(ctx.company.id);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alertas de pagos y cobros por vencer. Se recalculan al entrar al panel.
          </p>
        </div>
        {unread > 0 ? (
          <form action={readAllNotifications}>
            <button type="submit" className={secondaryButtonClass}>
              Marcar todas como leídas
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-card border border-border bg-surface px-4 py-6 text-sm text-muted-foreground">
          No hay alertas por ahora. Aparecerán aquí los documentos por pagar o cobrar que estén
          vencidos o por vencer en los próximos 5 días.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((notification) => {
            const unreadItem = notification.readAt === null;
            const variant = alertVariant(notification.type, !unreadItem);

            const readButton = unreadItem ? (
              <form action={readNotification}>
                <input type="hidden" name="id" value={notification.id} />
                <button
                  type="submit"
                  className="btn-liquid btn-liquid-secondary rounded-control border border-border bg-transparent px-2.5 py-1.5 text-xs text-foreground"
                >
                  Marcar como leída
                </button>
              </form>
            ) : null;

            const docLink = notification.href ? (
              <a
                href={notification.href}
                className="text-primary underline-offset-2 hover:underline"
              >
                Ver documento
              </a>
            ) : null;

            return (
              <li key={notification.id}>
                <Alert variant={variant} title={notification.title} action={readButton}>
                  <p>{notification.message}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {docLink}
                    <span>
                      {new Intl.DateTimeFormat("es-CL", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(notification.createdAt)}
                    </span>
                  </div>
                </Alert>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}