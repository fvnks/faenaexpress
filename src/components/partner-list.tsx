import Link from "next/link";

import { partnerTypeLabel } from "@/lib/labels";
import { cardClass, primaryButtonClass } from "@/lib/ui";

import type { Partner } from "@/generated/prisma/client";

// Lista de terceros reutilizada por las secciones de Clientes y Proveedores.
export function PartnerList({
  partners,
  basePath,
  writable,
  title,
  subtitle,
  newLabel,
  emptyTitle,
  emptyBody,
}: {
  partners: Partner[];
  basePath: string;
  writable: boolean;
  title: string;
  subtitle: string;
  newLabel: string;
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {writable ? (
          <Link href={`${basePath}/nuevo`} className={primaryButtonClass}>
            {newLabel}
          </Link>
        ) : null}
      </div>

      {partners.length === 0 ? (
        <div className={cardClass + " px-4 py-10 text-center"}>
          <p className="font-medium">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyBody}</p>
          {writable ? (
            <Link href={`${basePath}/nuevo`} className={primaryButtonClass + " mt-4 inline-block"}>
              {newLabel}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className={cardClass + " overflow-x-auto"}>
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">RUT</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} className="border-b border-border last:border-0 hover:bg-primary-soft/30 transition-colors">
                  <td className="px-4 py-3 align-top">
                    {writable ? (
                      <Link
                        href={`${basePath}/${partner.id}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {partner.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{partner.name}</span>
                    )}
                    {partner.address ? (
                      <div className="text-xs text-muted-foreground">{partner.address}</div>
                    ) : null}
                  </td>
                  <td className="tabular px-4 py-3 align-top">{partner.rut ?? "—"}</td>
                  <td className="px-4 py-3 align-top">{partnerTypeLabel(partner.type)}</td>
                  <td className="px-4 py-3 align-top">
                    <div>{partner.email ?? "—"}</div>
                    {partner.phone ? <div className="text-xs text-muted-foreground">{partner.phone}</div> : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {partner.active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Inactivo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
