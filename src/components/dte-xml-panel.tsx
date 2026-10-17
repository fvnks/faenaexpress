import { parseDteXml, type DteDocumento } from "@/lib/dte";
import { dteTipoLabel } from "@/lib/labels";
import { formatCLP, formatDate, toDateOnly } from "@/lib/money";
import { cardClass } from "@/lib/ui";

/**
 * Panel con TODO lo que trae el XML DTE original: encabezado, emisor, receptor,
 * montos, referencias, ítems, transporte y timbre electrónico. Se arma al vuelo
 * desde el `xmlContent` guardado, así que no depende de columnas en la base.
 */

function iso(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(toDateOnly(value)) : value;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{String(value)}</dd>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

function KeyValues({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <Grid>
      {entries.map(([key, value]) => (
        <Field key={key} label={key} value={value} />
      ))}
    </Grid>
  );
}

function DocumentBody({ doc }: { doc: DteDocumento }) {
  const emisorRows = [
    { label: "RUT", value: doc.rutEmisor },
    { label: "Razón social", value: doc.razonSocialEmisor },
    { label: "Giro", value: doc.giroEmisor },
    { label: "Actividad económica", value: doc.actecoEmisor },
    { label: "Dirección", value: doc.direccionEmisor },
    { label: "Comuna", value: doc.comunaEmisor },
    { label: "Ciudad", value: doc.ciudadEmisor },
    { label: "Teléfono", value: doc.telefonoEmisor },
    { label: "Correo", value: doc.emailEmisor },
    { label: "Sucursal", value: doc.sucursalEmisor },
  ];

  const receptorRows = [
    { label: "RUT", value: doc.rutReceptor },
    { label: "Razón social", value: doc.razonSocialReceptor },
    { label: "Giro", value: doc.giroReceptor },
    { label: "Contacto", value: doc.contactoReceptor },
    { label: "Dirección", value: doc.direccionReceptor },
    { label: "Comuna", value: doc.comunaReceptor },
    { label: "Ciudad", value: doc.ciudadReceptor },
    { label: "Teléfono", value: doc.telefonoReceptor },
    { label: "Correo", value: doc.emailReceptor },
  ];

  return (
    <>
      <Section title="Identificación" hint={doc.sobre === "desconocido" ? undefined : `Sobre ${doc.sobre}`}>
        <Grid>
          <Field label="Tipo de documento" value={`${doc.tipoDTE} · ${dteTipoLabel(doc.tipoDTE)}`} />
          <Field label="Folio" value={doc.folio} />
          <Field label="Fecha de emisión" value={iso(doc.fecha)} />
          <Field label="Fecha de vencimiento" value={iso(doc.vencimiento)} />
          <Field label="Forma de pago" value={doc.formaPago} />
          <Field label="Término de pago" value={doc.terminoPago} />
          <Field label="Ind. servicio" value={doc.indServicio} />
          <Field label="Período desde" value={iso(doc.periodoDesde)} />
          <Field label="Período hasta" value={iso(doc.periodoHasta)} />
          <Field label="Tipo traslado venta" value={doc.tpoTranVenta} />
          <Field label="Ind. traslado" value={doc.indTraslado} />
          <Field label="Fecha de referencia" value={iso(doc.fchRef)} />
          <Field label="Código de referencia" value={doc.codRef} />
          <Field label="Razón de referencia" value={doc.razonRef} />
          <Field label="Fecha de recepción SII" value={iso(doc.fechaRecepcion)} />
          <Field label="Estado receptor SII" value={doc.estadoReceptor} />
        </Grid>
      </Section>

      <Section title="Emisor">
        <Grid>
          {emisorRows.map((row) => (
            <Field key={row.label} label={row.label} value={row.value} />
          ))}
        </Grid>
      </Section>

      <Section title="Receptor">
        <Grid>
          {receptorRows.map((row) => (
            <Field key={row.label} label={row.label} value={row.value} />
          ))}
        </Grid>
      </Section>

      <Section title="Montos">
        <Grid>
          <Field label="Neto" value={formatCLP(doc.neto)} />
          <Field label="Exento" value={doc.exento > 0 ? formatCLP(doc.exento) : null} />
          <Field label="IVA" value={formatCLP(doc.iva)} />
          <Field label="IVA recargo" value={doc.ivaRecargo > 0 ? formatCLP(doc.ivaRecargo) : null} />
          <Field label="Tasa IVA" value={doc.tasaIVA !== null ? `${doc.tasaIVA}%` : null} />
          <Field label="Retención" value={doc.retencion > 0 ? formatCLP(doc.retencion) : null} />
          <Field label="Valor a pagar" value={doc.valorPagar > 0 ? formatCLP(doc.valorPagar) : null} />
          <Field label="Monto del período" value={doc.montoPeriodo > 0 ? formatCLP(doc.montoPeriodo) : null} />
          <Field label="Saldo anterior" value={doc.saldoAnterior !== 0 ? formatCLP(doc.saldoAnterior) : null} />
          <Field label="Total" value={formatCLP(doc.total)} />
        </Grid>

        {doc.impuestosRetenidos.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-2 py-1.5 font-medium">Impuesto</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Tasa</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {doc.impuestosRetenidos.map((imp, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5">{imp.tipo ?? "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{imp.tasa ?? "—"}</td>
                    <td className="tabular px-2 py-1.5 text-right">{formatCLP(imp.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {Object.keys(doc.totalesOtros).length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">Otros campos de Totales</p>
            <div className="mt-2">
              <KeyValues data={doc.totalesOtros} />
            </div>
          </div>
        ) : null}
      </Section>

      {doc.referencias.length > 0 ? (
        <Section title="Referencias" hint={`${doc.referencias.length} referencia(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-2 py-1.5 font-medium">Tipo doc.</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Folio</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Fecha</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Código</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Razón</th>
                </tr>
              </thead>
              <tbody>
                {doc.referencias.map((ref, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5">{ref.tpoDoc ?? "—"}</td>
                    <td className="tabular px-2 py-1.5">{ref.folio ?? "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{iso(ref.fecha) ?? "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{ref.codRef ?? "—"}</td>
                    <td className="px-2 py-1.5">{ref.razonRef ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {doc.pagos.length > 0 ? (
        <Section title="Pagos programados" hint={`${doc.pagos.length} pago(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-2 py-1.5 font-medium">Fecha</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Glosa</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {doc.pagos.map((pago, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5">{iso(pago.fecha) ?? "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{pago.glosa ?? "—"}</td>
                    <td className="tabular px-2 py-1.5 text-right">{formatCLP(pago.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {doc.itemsDetalle && doc.itemsDetalle.length > 0 ? (
        <Section title="Detalle del XML" hint={`${doc.itemsDetalle.length} línea(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-2 py-1.5 font-medium">N°</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Código</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Nombre</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Descripción</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Cant.</th>
                  <th scope="col" className="px-2 py-1.5 font-medium">Unidad</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Precio</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Descuento</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {doc.itemsDetalle.map((item, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5 text-muted-foreground">{item.nroLinDet ?? index + 1}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{item.codigo ?? "—"}</td>
                    <td className="px-2 py-1.5">{item.nombre}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{item.descripcion ?? "—"}</td>
                    <td className="tabular px-2 py-1.5 text-right">{item.cantidad}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{item.unidad ?? "—"}</td>
                    <td className="tabular px-2 py-1.5 text-right">{formatCLP(item.precio)}</td>
                    <td className="tabular px-2 py-1.5 text-right text-muted-foreground">
                      {item.descuentoMonto ? formatCLP(item.descuentoMonto) : item.descuentoPct ? `${item.descuentoPct}%` : "—"}
                    </td>
                    <td className="tabular px-2 py-1.5 text-right">{formatCLP(item.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {doc.transporte ? (
        <Section title="Transporte">
          <Grid>
            <Field label="Patente" value={doc.transporte.patente} />
            <Field label="RUT transporte" value={doc.transporte.rutTrans} />
            <Field label="RUT chofer" value={doc.transporte.rutChofer} />
            <Field label="Nombre chofer" value={doc.transporte.nombreChofer} />
            <Field label="Tipo de despacho" value={doc.transporte.tipoDespacho} />
            <Field label="Ind. traslado" value={doc.transporte.indTraslado} />
            <Field label="Dirección destino" value={doc.transporte.dirDest} />
            <Field label="Comuna destino" value={doc.transporte.cmnaDest} />
            <Field label="Ciudad destino" value={doc.transporte.ciudadDest} />
          </Grid>
        </Section>
      ) : null}

      {doc.timbre ? (
        <Section title="Timbre electrónico (TED)" hint={doc.timbre.frmt ? "Firmado" : undefined}>
          <p className="text-xs text-muted-foreground">
            El timbre repite datos del documento. Se listan los campos del bloque DD.
          </p>
          <div className="mt-3">
            <KeyValues data={doc.timbre.dd} />
          </div>
        </Section>
      ) : null}

      {doc.caratula ? (
        <Section title="Carátula del envío">
          <Grid>
            <Field label="RUT emisor" value={doc.caratula.rutEmisor} />
            <Field label="RUT receptor" value={doc.caratula.rutReceptor} />
            <Field label="RUT envia" value={doc.caratula.rutEnvia} />
            <Field label="Fecha resolución" value={iso(doc.caratula.fechaResol)} />
            <Field label="N° resolución" value={doc.caratula.nroResol} />
            <Field label="Firma del envío" value={doc.caratula.tmstFirmaEnv} />
          </Grid>
        </Section>
      ) : null}
    </>
  );
}

export function DteXmlPanel({
  xmlContent,
  folio,
  emptyNote,
}: {
  xmlContent: string | null;
  folio: string | null;
  emptyNote: string;
}) {
  if (!xmlContent) {
    return (
      <section className={cardClass + " px-5 py-4"}>
        <h2 className="text-sm font-semibold">Información del XML DTE</h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyNote}</p>
      </section>
    );
  }

  const parsed = parseDteXml(xmlContent);
  const doc =
    parsed.documentos.find((candidate) => candidate.folio === folio) ?? parsed.documentos[0] ?? null;

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
        <h2 className="text-sm font-semibold">Información del XML DTE</h2>
        <span className="text-xs text-muted-foreground">Datos tal cual vienen en el archivo del SII</span>
      </div>

      {parsed.error ? (
        <p className="border-t border-border px-5 py-4 text-sm text-danger">{parsed.error}</p>
      ) : null}

      {doc ? <DocumentBody doc={doc} /> : null}

      <details className="border-t border-border px-5 py-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          XML original
        </summary>
        <pre className="mt-3 max-h-96 overflow-auto rounded-control border border-border bg-background p-3 text-xs leading-relaxed text-foreground">
          {xmlContent}
        </pre>
      </details>
    </section>
  );
}
