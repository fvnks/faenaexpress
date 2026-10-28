"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition, useEffect } from "react";

import { createPosPartner, createPosSale, type PosActionState } from "@/app/actions/pos";
import { createPosSaleForTpvAction, type TpvActionState } from "@/app/actions/tpv";
import { SelectDropdown } from "@/components/select-dropdown";
import { SubmitButton } from "@/components/submit-button";
import { formatCLP } from "@/lib/money";
import { saveOfflineSale } from "@/lib/offline-sales";
import type { PosPartner, PosProduct } from "@/lib/pos";
import { useOfflineSales } from "@/hooks/use-offline-sales";
import {
  cardClass,
  controlClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

type CartLine = {
  productId: string;
  name: string;
  sku: string;
  priceNet: number;
  ivaAffected: boolean;
  tracksStock: boolean;
  stock: number;
  quantity: string;
  discount: string;
};

type PaymentLine = {
  key: string;
  method: string;
  /** Vacío significa «el total» mientras nadie lo haya tocado. */
  amount: string;
  touched: boolean;
  /** N° de autorización o comprobante, para pagos que no son efectivo. */
  reference: string;
};

type Totals = { net: number; tax: number; total: number };

function quantityOf(line: CartLine) {
  const value = Number(line.quantity.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function discountOf(line: CartLine) {
  const value = Number(line.discount.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function lineNet(line: CartLine) {
  return Math.max(0, Math.round(line.priceNet * quantityOf(line)) - discountOf(line));
}

function computeTotals(lines: CartLine[], ivaRate: number): Totals {
  let net = 0;
  let tax = 0;
  for (const line of lines) {
    const value = lineNet(line);
    net += value;
    tax += Math.round((value * (line.ivaAffected ? ivaRate : 0)) / 100);
  }
  return { net, tax, total: net + tax };
}

let paymentKey = 0;
function nextPaymentKey() {
  paymentKey += 1;
  return `pago-${paymentKey}`;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PosSaleForm({
  products,
  partners,
  methods,
  ivaRate,
  sessionOpenedAt,
}: {
  products: PosProduct[];
  partners: PosPartner[];
  methods: string[];
  ivaRate: number;
  sessionOpenedAt: string;
}) {
  const [state, formAction] = useActionState<PosActionState, FormData>(
    createPosSale,
    undefined,
  );
  const { isOnline, pendingCount, syncing } = useOfflineSales();
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [tpvState, tpvFormAction] = useActionState<TpvActionState, FormData>(
    createPosSaleForTpvAction,
    undefined,
  );

  // Redirigir a Transbank cuando la acción TPV devuelve una URL
  useEffect(() => {
    if (tpvState?.url) {
      window.location.href = tpvState.url;
    }
  }, [tpvState?.url]);

  /**
   * Wrapper del envío de venta: si hay conexión usa la Server Action normal;
   * si no, guarda la venta localmente para sincronizar después.
   */
  async function handleSubmit(formData: FormData) {
    if (!isOnline) {
      const payloadRaw = formData.get("payload");
      if (!payloadRaw) return;
      try {
        await saveOfflineSale(JSON.parse(String(payloadRaw)));
        setOfflineSaved(true);
        // Limpiar el carrito tras guardar offline
        setLines([]);
        setPartnerId("");
        setPartnerName("");
        setPartnerRut(null);
        setPartnerQuery("");
        setNotes("");
        setPayments([{ key: nextPaymentKey(), method: methods[0] ?? "Efectivo", amount: "", touched: false, reference: "" }]);
      } catch {
        setOfflineSaved(false);
      }
      return;
    }
    await formAction(formData);
  }

  const [lines, setLines] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerRut, setPartnerRut] = useState<string | null>(null);
  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Cliente nuevo sin salir de la venta: nombre + RUT (opcional).
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerRut, setNewPartnerRut] = useState("");
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [savingPartner, startSavingPartner] = useTransition();

  const defaultMethod = methods[0] ?? "Efectivo";
  const [payments, setPayments] = useState<PaymentLine[]>([
    { key: nextPaymentKey(), method: defaultMethod, amount: "", touched: false, reference: "" },
  ]);

  const totals = useMemo(() => computeTotals(lines, ivaRate), [lines, ivaRate]);

  const effectiveAmount = (payment: PaymentLine) => {
    if (!payment.touched) return totals.total;
    const value = Number(payment.amount.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  };

  const paid = payments.reduce((sum, payment) => sum + effectiveAmount(payment), 0);
  const remaining = Math.max(0, totals.total - paid);
  const change = Math.max(0, paid - totals.total);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products.slice(0, 60);
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          (product.categoryName ?? "").toLowerCase().includes(term),
      )
      .slice(0, 60);
  }, [products, query]);

  const filteredPartners = useMemo(() => {
    const term = partnerQuery.trim().toLowerCase();
    if (!term) return partners.slice(0, 8);
    return partners
      .filter(
        (partner) =>
          partner.name.toLowerCase().includes(term) ||
          (partner.rut ?? "").toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [partners, partnerQuery]);

  function addProduct(product: PosProduct) {
    const stock = Number(product.stock);
    const existing = lines.find((line) => line.productId === product.id);
    if (product.tracksStock && existing && quantityOf(existing) + 1 > stock) {
      return;
    }
    if (product.tracksStock && !existing && stock <= 0) {
      return;
    }

    setLines((prev) => {
      const found = prev.find((line) => line.productId === product.id);
      if (found) {
        return prev.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: String(Number(quantityOf(line).toFixed(3)) + 1) }
            : line,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          priceNet: product.priceNet,
          ivaAffected: product.ivaAffected,
          tracksStock: product.tracksStock,
          stock,
          quantity: "1",
          discount: "",
        },
      ];
    });
  }

  function updateLine(productId: string, patch: Partial<Pick<CartLine, "quantity" | "discount">>) {
    setLines((prev) =>
      prev.map((line) => (line.productId === productId ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((line) => line.productId !== productId));
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const term = query.trim().toLowerCase();
    if (!term) return;
    const exact = products.find((product) => product.sku.toLowerCase() === term);
    const target = exact ?? filteredProducts[0];
    if (target) {
      addProduct(target);
      setQuery("");
    }
  }

  function addPayment() {
    setPayments((prev) => {
      const last = prev[prev.length - 1];
      const asTouched = last.touched
        ? last
        : { ...last, touched: true, amount: String(effectiveAmount(last)) };
      return [
        ...prev.slice(0, -1),
        asTouched,
        {
          key: nextPaymentKey(),
          method: defaultMethod,
          amount: "",
          touched: true,
          reference: "",
        },
      ];
    });
  }

  function updatePayment(
    key: string,
    patch: Partial<Pick<PaymentLine, "method" | "amount" | "reference">>,
  ) {
    setPayments((prev) =>
      prev.map((payment) => {
        if (payment.key !== key) return payment;
        // Solo editar el monto fija el pago como tocado: cambiar el método o
        // escribir la referencia no debe congelar el monto, que mientras tanto
        // sigue al total de la venta.
        return { ...payment, ...patch, touched: patch.amount !== undefined ? true : payment.touched };
      }),
    );
  }

  function removePayment(key: string) {
    setPayments((prev) => (prev.length === 1 ? prev : prev.filter((p) => p.key !== key)));
  }

  function selectPartner(partner: { id: string; name: string; rut: string | null }) {
    setPartnerId(partner.id);
    setPartnerName(partner.name);
    setPartnerRut(partner.rut);
    setPartnerQuery("");
    setPartnerOpen(false);
    setCreatingPartner(false);
    setPartnerError(null);
  }

  function openCreatePartner() {
    // Si lo tecleado pinta a RUT (solo dígitos, puntos y guion), se precarga
    // como RUT; si no, como nombre.
    const term = partnerQuery.trim();
    const looksLikeRut = /^[0-9.\-\s]+[0-9kK]$/.test(term);
    setNewPartnerName(looksLikeRut ? "" : term);
    setNewPartnerRut(looksLikeRut ? term : "");
    setPartnerError(null);
    setCreatingPartner(true);
  }

  function saveNewPartner() {
    if (!newPartnerName.trim() && !newPartnerRut.trim()) {
      setPartnerError("Ingresa el nombre o el RUT del cliente.");
      return;
    }
    startSavingPartner(async () => {
      const result = await createPosPartner({ name: newPartnerName, rut: newPartnerRut });
      if (result.error) {
        setPartnerError(result.error);
        return;
      }
      if (result.partner) selectPartner(result.partner);
    });
  }

  function payExact() {
    setPayments((prev) =>
      prev.length === 1
        ? [{ ...prev[0], touched: true, amount: String(totals.total) }]
        : prev,
    );
  }

  const invalidLines = lines.filter((line) => quantityOf(line) <= 0);
  const overStock = lines.filter(
    (line) => line.tracksStock && quantityOf(line) > line.stock,
  );

  const payload = {
    partnerId: partnerId || null,
    items: lines.map((line) => ({
      productId: line.productId,
      quantity: quantityOf(line),
      discount: discountOf(line),
    })),
    payments: payments
      .map((payment) => ({
        method: payment.method,
        amount: effectiveAmount(payment),
        reference: payment.reference.trim() || undefined,
      }))
      .filter((payment) => payment.amount > 0),
    notes: notes.trim() || null,
  };

  const canSubmit =
    lines.length > 0 &&
    invalidLines.length === 0 &&
    overStock.length === 0 &&
    remaining === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vender</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Caja abierta desde las {formatTime(sessionOpenedAt)}.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {lines.length === 0
            ? "Busca un producto por nombre o SKU para empezar."
            : `${lines.length} ${lines.length === 1 ? "producto" : "productos"} en la venta`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        {/* Catálogo */}
        <section className={cardClass + " flex min-h-[24rem] flex-col p-4"}>
          <label htmlFor="pos-product-search" className={labelClass}>
            Buscar producto
          </label>
          <input
            id="pos-product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Nombre, SKU o código de barras"
            className={controlClass + " mt-1.5"}
            autoComplete="off"
            autoFocus
          />

          {filteredProducts.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {products.length === 0
                ? "No hay productos con precio de venta. Configúralos en Inventario."
                : "Ningún producto coincide con la búsqueda."}
            </p>
          ) : (
            <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const stock = Number(product.stock);
                const agotado = product.tracksStock && stock <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    disabled={agotado}
                    className={
                      "flex flex-col gap-1 rounded-control border border-border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
                    }
                  >
                    <span className="line-clamp-2 text-sm font-medium text-foreground">
                      {product.name}
                    </span>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="tabular text-base font-semibold text-foreground">
                        {formatCLP(product.priceNet)}
                      </span>
                      <span className="tabular truncate text-xs text-muted-foreground">
                        {product.tracksStock
                          ? agotado
                            ? "Sin stock"
                            : `Stock ${stock.toLocaleString("es-CL", { maximumFractionDigits: 3 })}`
                          : "Sin control de stock"}
                      </span>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {product.sku}
                      {product.categoryName ? ` · ${product.categoryName}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Venta */}
        <section className={cardClass + " flex flex-col"}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Venta actual</h2>
          </div>

          {/* Cliente */}
          <div className="relative border-b border-border px-4 py-3">
            <label htmlFor="pos-partner-search" className="text-xs uppercase text-muted-foreground">
              Cliente
            </label>
            {!partnerId ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="pos-partner-search"
                  type="text"
                  value={partnerQuery}
                  onChange={(event) => {
                    setPartnerQuery(event.target.value);
                    setPartnerOpen(true);
                    if (creatingPartner) setCreatingPartner(false);
                  }}
                  onFocus={() => setPartnerOpen(true)}
                  onBlur={() => setTimeout(() => setPartnerOpen(false), 150)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  placeholder="Consumidor final (opcional)"
                  className={controlClass}
                  autoComplete="off"
                />
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {partnerName}
                  {partnerRut ? (
                    <span className="tabular ml-2 text-xs font-normal text-muted-foreground">
                      RUT {partnerRut}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPartnerId("");
                    setPartnerName("");
                    setPartnerRut(null);
                    setPartnerQuery("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Quitar
                </button>
              </div>
            )}

            {!partnerId && creatingPartner ? (
              <div className="absolute inset-x-4 top-full z-30 rounded-card border border-border bg-surface p-3 shadow-lg">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Nuevo cliente
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="text"
                    value={newPartnerName}
                    onChange={(event) => setNewPartnerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveNewPartner();
                      }
                    }}
                    placeholder="Nombre o razón social"
                    aria-label="Nombre del nuevo cliente"
                    className={controlClass}
                    autoFocus
                    maxLength={120}
                  />
                  <input
                    type="text"
                    value={newPartnerRut}
                    onChange={(event) => setNewPartnerRut(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveNewPartner();
                      }
                    }}
                    placeholder="RUT (opcional)"
                    aria-label="RUT del nuevo cliente"
                    className={controlClass + " tabular"}
                    autoComplete="off"
                  />
                  {partnerError ? (
                    <p role="alert" className="text-xs text-danger">
                      {partnerError}
                    </p>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingPartner(false);
                        setPartnerError(null);
                      }}
                      className={secondaryButtonClass + " px-2 py-1 text-xs"}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveNewPartner}
                      disabled={savingPartner}
                      className={primaryButtonClass + " px-3 py-1 text-xs"}
                    >
                      {savingPartner ? "Guardando…" : "Guardar y usar"}
                    </button>
                  </div>
                </div>
              </div>
            ) : !partnerId && partnerOpen ? (
              <ul className="absolute inset-x-4 top-full z-30 max-h-56 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-lg">
                {filteredPartners.map((partner) => (
                  <li key={partner.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectPartner(partner);
                      }}
                      className="flex w-full flex-col rounded-control px-2 py-1.5 text-left text-sm transition-colors hover:bg-background"
                    >
                      <span className="truncate font-medium">{partner.name}</span>
                      {partner.rut ? (
                        <span className="truncate text-xs text-muted-foreground">{partner.rut}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
                {partnerQuery.trim() ? (
                  <li className="border-t border-border">
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        openCreatePartner();
                      }}
                      className="w-full rounded-control px-2 py-1.5 text-left text-sm text-primary transition-colors hover:bg-background"
                    >
                      + Crear cliente «{partnerQuery.trim()}»
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          {/* Líneas */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Todavía no agregaste productos.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {lines.map((line) => {
                  const stockWarning = line.tracksStock && quantityOf(line) > line.stock;
                  return (
                    <li key={line.productId} className="flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {line.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId)}
                          aria-label={`Quitar ${line.name}`}
                          className="text-xs text-muted-foreground hover:text-danger"
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.001"
                          step="0.001"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.productId, { quantity: event.target.value })
                          }
                          onFocus={(event) => event.currentTarget.select()}
                          aria-label={`Cantidad de ${line.name}`}
                          className={controlClass + " tabular w-20 px-2 py-1 text-right"}
                        />
                        <span className="text-xs text-muted-foreground">
                          × {formatCLP(line.priceNet)}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={line.discount}
                          onChange={(event) =>
                            updateLine(line.productId, { discount: event.target.value })
                          }
                          onFocus={(event) => event.currentTarget.select()}
                          placeholder="Desc."
                          aria-label={`Descuento de ${line.name}`}
                          className={controlClass + " tabular w-20 px-2 py-1 text-right"}
                        />
                        <span className="tabular ml-auto text-sm font-semibold">
                          {formatCLP(lineNet(line))}
                        </span>
                      </div>
                      {stockWarning ? (
                        <p className="text-xs text-danger">
                          Solo hay {line.stock.toLocaleString("es-CL", { maximumFractionDigits: 3 })}{" "}
                          en stock.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Totales y pago */}
          <div className="border-t border-border px-4 py-3">
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Neto</dt>
                <dd className="tabular">{formatCLP(totals.net)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">IVA {ivaRate}%</dt>
                <dd className="tabular">{formatCLP(totals.tax)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-1">
                <dt className="font-semibold">Total</dt>
                <dd className="tabular text-lg font-bold">{formatCLP(totals.total)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className={labelClass}>Pago</span>
                <div className="flex gap-2">
                  {payments.length === 1 ? (
                    <button
                      type="button"
                      onClick={payExact}
                      className="text-xs text-primary hover:underline"
                    >
                      Monto exacto
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={addPayment}
                    className="text-xs text-primary hover:underline"
                  >
                    Dividir pago
                  </button>
                </div>
              </div>

              {payments.map((payment, index) => {
                const isCash = payment.method.toLowerCase().includes("efectivo");
                return (
                <div key={payment.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <SelectDropdown
                      name={`method-${payment.key}`}
                      value={payment.method}
                      options={methods.map((method) => ({ value: method, label: method }))}
                      allowEmpty={false}
                      emptyLabel={defaultMethod}
                      onValueChange={(value) => updatePayment(payment.key, { method: value })}
                      className="min-w-0 flex-1"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={payment.touched ? payment.amount : String(totals.total)}
                      onChange={(event) =>
                        updatePayment(payment.key, { amount: event.target.value })
                      }
                      onFocus={(event) => event.currentTarget.select()}
                      aria-label={`Monto del pago ${index + 1}`}
                      className={controlClass + " tabular w-28 px-2 py-2 text-right"}
                    />
                    {payments.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePayment(payment.key)}
                        aria-label={`Quitar pago ${index + 1}`}
                        className="text-xs text-muted-foreground hover:text-danger"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                  {!isCash ? (
                    <input
                      type="text"
                      value={payment.reference}
                      onChange={(event) =>
                        updatePayment(payment.key, { reference: event.target.value })
                      }
                      maxLength={60}
                      placeholder="N° de autorización o comprobante (opcional)"
                      aria-label={`Referencia del pago ${index + 1}`}
                      className={controlClass + " px-2 py-1 text-xs"}
                      autoComplete="off"
                    />
                  ) : null}
                </div>
                );
              })}

              {totals.total > 0 ? (
                remaining > 0 ? (
                  <p className="text-xs text-danger">Faltan {formatCLP(remaining)}.</p>
                ) : change > 0 ? (
                  <p className="text-xs text-accent">Vuelto: {formatCLP(change)}.</p>
                ) : (
                  <p className="text-xs text-success">Pago completo.</p>
                )
              ) : null}
            </div>

            <div className={fieldClass + " mt-4"}>
              <label htmlFor="pos-notes" className={labelClass}>
                Nota (opcional)
              </label>
              <input
                id="pos-notes"
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={200}
                className={controlClass}
                placeholder="Mesa 4, retiro, boleta…"
              />
            </div>

            {!isOnline && (
              <section className={cardClass + " p-3 mb-3 border border-danger/40 bg-danger-soft"}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-danger">●</span>
                  <span className="font-medium text-danger">
                    Sin conexión a internet
                  </span>
                  <span className="text-muted-foreground">
                    La venta se guardará localmente y se sincronizará al recuperar la conexión.
                  </span>
                </div>
                {pendingCount > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hay {pendingCount} venta(s) pendiente(s) de sincronizar.
                  </p>
                )}
                {syncing && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sincronizando ventas pendientes…
                  </p>
                )}
              </section>
            )}

            {offlineSaved && (
              <section className={cardClass + " p-3 mb-3 border border-success/40 bg-success-soft"}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-success">●</span>
                  <span className="font-medium text-success">
                    Venta guardada localmente
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Se registrará en el servidor al recuperar la conexión.
                </p>
              </section>
            )}

            {state?.error ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {state.error}
              </p>
            ) : null}

            <form action={handleSubmit} className="mt-4">
              <input type="hidden" name="payload" value={JSON.stringify(payload)} />
              <SubmitButton
                className={primaryButtonClass + " w-full"}
                pendingLabel="Registrando…"
                disabled={!canSubmit}
              >
                Cobrar {formatCLP(totals.total)}
              </SubmitButton>
            </form>

            {isOnline && totals.total > 0 && payments.some((p) =>
              p.method.toLowerCase().includes("tarjeta")
            ) && (
              <form action={tpvFormAction} className="mt-3">
                <input type="hidden" name="payload" value={JSON.stringify(payload)} />
                <SubmitButton
                  className="border border-accent/40 bg-accent-soft text-accent hover:bg-accent w-full"
                  pendingLabel="Redirigiendo a Transbank…"
                  disabled={!!tpvState?.error || !!tpvState?.ok}
                >
                  Pagar con tarjeta (TPV)
                </SubmitButton>
                {tpvState?.error && (
                  <p role="alert" className="mt-2 text-sm text-danger">
                    {tpvState.error}
                  </p>
                )}
                {tpvState?.url && (
                  <p className="mt-2 text-sm text-success">
                    Redirigiendo a Transbank para completar el pago…
                  </p>
                )}
              </form>
            )}

            {lines.length > 0 ? (
              <button
                type="button"
                onClick={() => setLines([])}
                className={secondaryButtonClass + " mt-2 w-full"}
              >
                Vaciar venta
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Tip: escribe el código de barras y presiona Enter para agregar el producto sin soltar el
          teclado.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/pos/ventas" className={secondaryButtonClass}>
          Ver ventas
        </Link>
      </div>
    </div>
  );
}
