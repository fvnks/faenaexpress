"use client";

import Link from "next/link";
import { useState } from "react";

import { BarcodeLabel } from "@/components/barcode-label";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

interface SelectedProduct {
  product: {
    id: string;
    sku: string;
    name: string;
    priceNet: number;
    tracksStock: boolean;
    stock: string;
  };
  count: number;
}

export function EtiquetasClient({ products }: { products: any[] }) {
  const [selected, setSelected] = useState<SelectedProduct[]>([]);
  const [printing, setPrinting] = useState(false);

  const toggleProduct = (product: any) => {
    setSelected((prev) => {
      const existing = prev.find((p) => p.product.id === product.id);
      if (existing) {
        return prev.filter((p) => p.product.id !== product.id);
      }
      return [
        ...prev,
        {
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            priceNet: product.priceNet,
            tracksStock: product.tracksStock,
            stock: product.stock,
          },
          count: 1,
        },
      ];
    });
  };

  const updateCount = (productId: string, count: number) => {
    setSelected((prev) =>
      prev.map((p) =>
        p.product.id === productId ? { ...p, count: Math.max(1, count) } : p
      )
    );
  };

  const totalLabels = selected.reduce((sum, p) => sum + p.count, 0);

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setPrinting(false);
  };

  const priceText = (priceNet: number) =>
    priceNet !== null && priceNet !== undefined
      ? priceNet.toLocaleString("es-CL", { maximumFractionDigits: 0 })
      : "Sin precio";

  const selectedItems = selected.flatMap(({ product, count }) =>
    Array.from({ length: count }, (_, i) => ({
      key: `${product.id}-${i}`,
      sku: product.sku,
      name: product.name,
      price: product.priceNet,
      width: 220,
      height: 110,
    }))
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Etiquetas de código de barras
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Genera etiquetas con código de barras Code 128 para imprimir y
            etiquetar productos en el punto de venta.
          </p>
        </div>
        <Link href="/pos/productos" className={secondaryButtonClass}>
          Volver a productos
        </Link>
      </div>

      <section className={`${cardClass} p-5`}>
        <h2 className="text-sm font-semibold mb-3">Seleccionar productos</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Marca los productos para los que quieres imprimir etiquetas.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 overflow-y-auto max-h-[60vh]">
          {products.length === 0 ? (
            <p className="col-span-full text-center text-sm text-muted-foreground py-8">
              No hay productos disponibles.
            </p>
          ) : null}
          {products.map((product) => {
            const isSelected = selected.some((p) => p.product.id === product.id);
            const existing = selected.find((p) => p.product.id === product.id);
            return (
              <div
                key={product.id}
                className={`border rounded p-3 cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? "border-primary bg-primary-soft/20"
                    : "border-border bg-white hover:border-primary hover:bg-primary-soft/10"
                }`}
                onClick={() => toggleProduct(product)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{product.sku}</span>
                  {isSelected ? (
                    <span className="text-primary font-bold">✓</span>
                  ) : null}
                </div>
                <div className="block truncate text-sm font-medium">
                  {product.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {product.tracksStock ? `Stock: ${product.stock}` : "Sin control de stock"}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {priceText(product.priceNet)}
                </div>
                {isSelected && (
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-xs text-muted-foreground">Cantidad:</label>
                    <input
                      type="number"
                      min="1"
                      value={existing?.count}
                      onChange={(e) =>
                        updateCount(
                          product.id,
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="w-12 text-xs rounded border border-border px-2 py-1 text-center"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {selected.length > 0 && (
        <>
          <section className={`${cardClass} p-5`}>
            <h2 className="text-sm font-semibold mb-3">
              Vista previa de etiquetas
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              {totalLabels} etiqueta(s) se imprimirán. Cada etiqueta incluye el
              código de barras, nombre del producto y precio.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {selectedItems.map((label) => (
                <BarcodeLabel
                  key={label.key}
                  sku={label.sku}
                  name={label.name}
                  price={label.price}
                  width={label.width}
                  height={label.height}
                />
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              className={primaryButtonClass}
            >
              {printing ? "Imprimiendo..." : "Imprimir etiquetas"}
            </button>
            <Link href="/pos/productos" className={secondaryButtonClass}>
              Volver a productos
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
