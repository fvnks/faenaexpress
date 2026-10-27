"use client";

import { useMemo, useState, useTransition } from "react";

import {
  adjustPosStock,
  createPosProduct,
  updatePosProduct,
} from "@/app/actions/pos";
import { formatCLP } from "@/lib/money";
import type { PosCatalogItem } from "@/lib/pos";
import {
  cardClass,
  controlClass,
  dangerButtonClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/ui";

type FormState = {
  open: boolean;
  id: string | null;
  name: string;
  sku: string;
  price: string;
  ivaAffected: boolean;
  tracksStock: boolean;
  initialStock: string;
  active: boolean;
};

const formVacio: FormState = {
  open: false,
  id: null,
  name: "",
  sku: "",
  price: "",
  ivaAffected: true,
  tracksStock: true,
  initialStock: "0",
  active: true,
};

export function PosProductsClient({
  products,
  ivaRate,
  puedeEditar,
}: {
  products: PosCatalogItem[];
  ivaRate: number;
  puedeEditar: boolean;
}) {
  const [form, setForm] = useState<FormState>(formVacio);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.categoryName ?? "").toLowerCase().includes(term),
    );
  }, [products, query]);

  function abrirCrear() {
    setForm({ ...formVacio, open: true });
    setError(null);
  }

  function abrirEditar(product: PosCatalogItem) {
    setForm({
      open: true,
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.priceNet ? String(product.priceNet) : "",
      ivaAffected: product.ivaAffected,
      tracksStock: product.tracksStock,
      initialStock: product.stock,
      active: product.active,
    });
    setError(null);
  }

  function cerrar() {
    setForm(formVacio);
    setError(null);
  }

  function guardar() {
    if (!form.name.trim()) {
      setError("Ingresa el nombre del producto.");
      return;
    }
    const precio = Number(form.price.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(precio) || precio < 0) {
      setError("El precio de venta no es válido.");
      return;
    }
    startSaving(async () => {
      if (form.id) {
        const result = await updatePosProduct({
          id: form.id,
          name: form.name,
          sku: form.sku,
          priceNet: precio,
          ivaAffected: form.ivaAffected,
          tracksStock: form.tracksStock,
          active: form.active,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        // Si tocaron el stock en el formulario, se registra como ajuste.
        if (form.tracksStock) {
          const original = products.find((p) => p.id === form.id);
          const nueva = Number(form.initialStock.replace(",", "."));
          const actual = original ? Number(original.stock) : 0;
          if (Number.isFinite(nueva) && Math.abs(nueva - actual) >= 0.0005) {
            const ajuste = await adjustPosStock({
              productId: form.id,
              newQuantity: nueva,
              reason: "Ajuste al editar el producto",
            });
            if (ajuste.error) {
              setError(ajuste.error);
              return;
            }
          }
        }
      } else {
        const result = await createPosProduct({
          name: form.name,
          sku: form.sku,
          priceNet: precio,
          ivaAffected: form.ivaAffected,
          tracksStock: form.tracksStock,
          initialStock: Number(form.initialStock.replace(",", ".")) || 0,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      cerrar();
    });
  }

  function precioConIva(priceNet: number, ivaAffected: boolean) {
    return ivaAffected ? Math.round(priceNet * (1 + ivaRate / 100)) : priceNet;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El catálogo que la caja vende. Es el mismo inventario de la empresa: si mañana
            contratas Facturas, estos productos ya están ahí.
          </p>
        </div>
        {puedeEditar ? (
          <button type="button" onClick={abrirCrear} className={primaryButtonClass}>
            Nuevo producto
          </button>
        ) : null}
      </div>

      <div className={cardClass + " p-4"}>
        <label htmlFor="pos-catalog-search" className={labelClass}>
          Buscar
        </label>
        <input
          id="pos-catalog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre, SKU o categoría"
          className={controlClass + " mt-1.5 max-w-md"}
          autoComplete="off"
        />
      </div>

      {form.open && puedeEditar ? (
        <section className={cardClass + " p-5"}>
          <h2 className="text-sm font-semibold">
            {form.id ? "Editar producto" : "Nuevo producto"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="pos-prod-name" className={labelClass}>
                Nombre
              </label>
              <input
                id="pos-prod-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={120}
                className={controlClass}
                autoFocus
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="pos-prod-sku" className={labelClass}>
                SKU o código de barras
              </label>
              <input
                id="pos-prod-sku"
                type="text"
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
                placeholder={form.id ? "" : "Se genera uno solo si lo dejas vacío"}
                maxLength={60}
                className={controlClass + " tabular"}
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="pos-prod-price" className={labelClass}>
                Precio de venta (neto)
              </label>
              <input
                id="pos-prod-price"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                className={controlClass + " tabular text-right"}
              />
              {form.price !== "" && Number.isFinite(Number(form.price)) ? (
                <p className="text-xs text-muted-foreground">
                  Con IVA {ivaRate}%:{" "}
                  <span className="tabular">
                    {formatCLP(precioConIva(Number(form.price), form.ivaAffected))}
                  </span>
                </p>
              ) : null}
            </div>
            {form.tracksStock ? (
              <div className={fieldClass}>
                <label htmlFor="pos-prod-stock" className={labelClass}>
                  {form.id ? "Stock (ajuste de conteo)" : "Stock inicial"}
                </label>
                <input
                  id="pos-prod-stock"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  value={form.initialStock}
                  onChange={(event) => setForm({ ...form, initialStock: event.target.value })}
                  className={controlClass + " tabular text-right"}
                  disabled={Boolean(form.id) === false && !form.tracksStock}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.ivaAffected}
                onChange={(event) => setForm({ ...form, ivaAffected: event.target.checked })}
              />
              Afecto a IVA
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.tracksStock}
                onChange={(event) => setForm({ ...form, tracksStock: event.target.checked })}
              />
              Controla stock
            </label>
            {form.id ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                />
                Activo (se puede vender)
              </label>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={cerrar} className={secondaryButtonClass}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className={primaryButtonClass}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </section>
      ) : null}

      <section className={cardClass + " overflow-x-auto"}>
        {filtrados.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">
              {products.length === 0
                ? "Todavía no hay productos."
                : "Ningún producto coincide con la búsqueda."}
            </p>
            {products.length === 0 && puedeEditar ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Crea tu primer producto con el botón «Nuevo producto».
              </p>
            ) : null}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2 text-right">Precio neto</th>
                <th className="px-4 py-2 text-right">Precio con IVA</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">Mín.</th>
                <th className="px-4 py-2">Estado</th>
                {puedeEditar ? <th className="px-4 py-2 text-right"></th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((product) => (
                <tr key={product.id} className={product.active ? "" : "opacity-60"}>
                  <td className="px-4 py-2 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-2">
                    <span className="block max-w-[18rem] truncate">{product.name}</span>
                    {product.categoryName ? (
                      <span className="block text-xs text-muted-foreground">
                        {product.categoryName}
                      </span>
                    ) : null}
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {formatCLP(product.priceNet)}
                  </td>
                  <td className="tabular px-4 py-2 text-right text-muted-foreground">
                    {formatCLP(precioConIva(product.priceNet, product.ivaAffected))}
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {product.tracksStock
                      ? Number(product.stock).toLocaleString("es-CL", {
                          maximumFractionDigits: 3,
                        })
                      : "—"}
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {product.minStock
                      ? Number(product.minStock).toLocaleString("es-CL", {
                          maximumFractionDigits: 3,
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {!product.active ? (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                        Inactivo
                      </span>
                    ) : product.tracksStock && Number(product.stock) <= 0 ? (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                        Sin stock
                      </span>
                    ) : product.tracksStock && product.minStock && Number(product.stock) <= Number(product.minStock) ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        Stock bajo
                      </span>
                    ) : (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                        A la venta
                      </span>
                    )}
                  </td>
                  {puedeEditar ? (
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEditar(product)}
                        className="text-primary hover:underline"
                      >
                        Editar
                      </button>
                      {!product.active ? (
                        <button
                          type="button"
                          onClick={() => abrirEditar(product)}
                          className={dangerButtonClass + " ml-2 px-2 py-1 text-xs"}
                        >
                          Reactivar
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Costos, bodegas, mínimos, proveedor y lotes se administran en el inventario de Facturas
        (módulo Inventario). Los movimientos de stock del POS quedan trazados en el mismo kardex.
      </p>
    </div>
  );
}
