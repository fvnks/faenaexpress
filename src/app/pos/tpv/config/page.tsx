import Link from "next/link";
import { redirect } from "next/navigation";

import { requireContext } from "@/lib/auth";
import { cardClass, controlClass, fieldClass, labelClass, primaryButtonClass, secondaryButtonClass, dangerButtonClass } from "@/lib/ui";
import { getTpvConfigAction, saveTpvConfigAction, deleteTpvConfigAction, type TpvConfigActionState } from "@/app/actions/tpv";

export default async function PosTpvConfigPage() {
  const ctx = await requireContext();

  // Obtener configuración actual
  const configResult = await getTpvConfigAction(undefined);
  const config = configResult?.config;

  if (configResult?.error) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center min-h-[40vh] gap-4">
        <h2 className="text-xl font-bold tracking-tight">Error</h2>
        <p className="text-sm text-danger">{configResult.error}</p>
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al resumen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración TPV</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura las credenciales de Transbank Webpay Plus para aceptar
            pagos con tarjeta desde el punto de venta.
          </p>
        </div>
        <Link href="/pos" className={secondaryButtonClass}>
          Volver al resumen
        </Link>
      </div>

      {configResult?.error && (
        <p role="alert" className="text-sm text-danger">
          {configResult.error}
        </p>
      )}

      <section className={cardClass + " p-6"}>
        <h2 className="text-sm font-semibold mb-4">Credenciales de Transbank</h2>
        <form action={handleSaveConfig} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className={fieldClass} style={{ minWidth: "200px" }}>
            <label htmlFor="tpv-comercio-id" className={labelClass}>
              Comercio ID
            </label>
            <input
              id="tpv-comercio-id"
              name="comercioId"
              type="text"
              maxLength={50}
              placeholder="Ej: 597055555532"
              defaultValue={config?.comercioId ?? ""}
              className={controlClass}
              required
            />
            <p className="text-xs text-muted-foreground">
              Código de comercio entregado por Transbank
            </p>
          </div>

          <div className={fieldClass} style={{ minWidth: "250px" }}>
            <label htmlFor="tpv-api-key" className={labelClass}>
              API Key
            </label>
            <input
              id="tpv-api-key"
              name="apiKey"
              type="password"
              maxLength={200}
              placeholder="Llave API de Transbank"
              defaultValue={config?.apiKey === "***configurada***" ? "" : config?.apiKey ?? ""}
              className={controlClass}
              required
            />
            <p className="text-xs text-muted-foreground">
              Llave API de Transbank (se cifra en la base de datos)
            </p>
          </div>

          <div className={fieldClass} style={{ minWidth: "180px" }}>
            <label htmlFor="tpv-ambiente" className={labelClass}>
              Ambiente
            </label>
            <select
              id="tpv-ambiente"
              name="ambiente"
              className={controlClass}
              defaultValue={config?.ambiente ?? "integracion"}
            >
              <option value="integracion">Integración (pruebas)</option>
              <option value="produccion">Producción</option>
            </select>
          </div>

          <div className={fieldClass}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="habilitado"
                type="checkbox"
                defaultChecked={config?.habilitado ?? false}
                className="rounded border-border bg-surface text-primary focus:ring-primary"
              />
              Habilitar pagos con tarjeta
            </label>
            <p className="text-xs text-muted-foreground">
              Cuando está habilitado, se muestra la opción de pago con tarjeta
              en la venta del POS
            </p>
          </div>

          <button
            type="submit"
            className={primaryButtonClass}
          >
            Guardar configuración
          </button>
        </form>
      </section>

      {config?.habilitado && (
        <section className={cardClass + " p-6 border border-success/40 bg-success-soft/10"}>
          <h2 className="text-sm font-semibold mb-3">Estado: Habilitado</h2>
          <p className="text-sm text-muted-foreground">
            El módulo TPV está activo. En la pantalla de venta, al seleccionar
            "Tarjeta de crédito" o "Tarjeta de débito" como medio de pago,
            aparecerá la opción de pagar con TPV.
          </p>
        </section>
      )}

      <section className={cardClass + " p-6 border border-danger/40 bg-danger-soft/5"}>
        <h2 className="text-sm font-semibold mb-3">Crédenciales de prueba (integración)</h2>
        <p className="text-sm text-muted-foreground">
          Para probar en el ambiente de integración de Transbank, usa estas
          credenciales de prueba:
        </p>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Comercio ID</dt>
            <dd className="tabular font-mono text-xs">597055555532</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">API Key</dt>
            <dd className="tabular font-mono text-xs">579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          Tarjetas de prueba: 4051 8856 0044 6623 (aprobada) /
          4051 8856 0044 6608 (rechazada). CVV: cualquier 3 dígitos. Fecha:
          cualquier fecha futura.
        </p>
      </section>

      {config && (
        <section className={cardClass + " p-4 mt-4"}>
          <form action={handleDeleteConfig} className="mt-4">
            <button
              type="submit"
              className={dangerButtonClass + " text-sm px-3 py-1.5"}
            >
              Eliminar configuración TPV
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

async function handleSaveConfig(formData: FormData) {
  await saveTpvConfigAction(undefined, formData);
}

async function handleDeleteConfig(formData: FormData) {
  await deleteTpvConfigAction(undefined);
}
