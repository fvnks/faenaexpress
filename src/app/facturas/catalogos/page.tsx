import {
  createArea,
  createCategory,
  createPayer,
  createSalesperson,
  createPaymentMethod,
  createUnit,
  createProductCategory,
  createWarehouse,
  updateArea,
  updateCategory,
  updatePayer,
  updateSalesperson,
  updatePaymentMethod,
  updateUnit,
  updateProductCategory,
  updateWarehouse,
} from "@/app/actions/catalogs";
import { CatalogCreateForm, CatalogRow } from "@/app/facturas/catalogos/catalog-forms";
import { canWrite, requireContext } from "@/lib/auth";
import {
  listAreasAdmin,
  listCategoriesAdmin,
  listPayersAdmin,
  listSalespeopleAdmin,
  listPaymentMethodsAdmin,
  listUnitsAdmin,
  listProductCategoriesAdmin,
} from "@/lib/catalogs";
import { listWarehouses } from "@/lib/inventory";
import { cardClass } from "@/lib/ui";

export default async function CatalogsPage() {
  const ctx = await requireContext("catalogos");
  const writable = canWrite(ctx, "catalogos");
  const [areas, categories, salespeople, payers, paymentMethods, units, productCategories, warehouses] = await Promise.all([
    listAreasAdmin(ctx.company.id),
    listCategoriesAdmin(ctx.company.id),
    listSalespeopleAdmin(ctx.company.id),
    listPayersAdmin(ctx.company.id),
    listPaymentMethodsAdmin(ctx.company.id),
    listUnitsAdmin(ctx.company.id),
    listProductCategoriesAdmin(ctx.company.id),
    listWarehouses(ctx.company.id, true),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Áreas, categorías, vendedores, pagadores y medios de pago que se eligen al registrar movimientos.
          Los trabajadores se gestionan en{" "}
          <a href="/facturas/rrhh" className="text-primary underline-offset-2 hover:underline">RRHH</a>.
        </p>
      </div>

      {!writable ? (
        <p className={cardClass + " px-4 py-3 text-sm text-muted-foreground"}>
          Tu rol solo permite ver los catálogos.
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Áreas</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Área de la empresa a la que se imputa el movimiento.
          </p>

          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm action={createArea} idPrefix="area" placeholder="Nueva área" />
            </div>
          ) : null}

          <div className="mt-4">
            {areas.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Aún no hay áreas.</p>
            ) : (
              areas.map((area) => (
                <CatalogRow key={area.id} item={area} action={updateArea} readOnly={!writable} />
              ))
            )}
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Categorías</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Clasificación del gasto o ingreso (insumos, servicios, etc.).
          </p>

          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm
                action={createCategory}
                withKind
                idPrefix="category"
                placeholder="Nueva categoría"
              />
            </div>
          ) : null}

          <div className="mt-4">
            {categories.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Aún no hay categorías.</p>
            ) : (
              categories.map((category) => (
                <CatalogRow
                  key={category.id}
                  item={category}
                  action={updateCategory}
                  withKind
                  readOnly={!writable}
                />
              ))
            )}
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Vendedores</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Personas que realizan las ventas.
          </p>

          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm
                action={createSalesperson}
                idPrefix="salesperson"
                placeholder="Nuevo vendedor"
              />
            </div>
          ) : null}

          <div className="mt-4">
            {salespeople.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Aún no hay vendedores.</p>
            ) : (
              salespeople.map((salesperson) => (
                <CatalogRow
                  key={salesperson.id}
                  item={salesperson}
                  action={updateSalesperson}
                  readOnly={!writable}
                />
              ))
            )}
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Pagadores</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quién pagó cada gasto (una persona o la caja de la empresa).
          </p>

          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm
                action={createPayer}
                idPrefix="payer"
                placeholder="Nuevo pagador"
              />
            </div>
          ) : null}

          <div className="mt-4">
            {payers.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Aún no hay pagadores.</p>
            ) : (
              payers.map((payer) => (
                <CatalogRow key={payer.id} item={payer} action={updatePayer} readOnly={!writable} />
              ))
            )}
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Unidades de medida</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Unidades para productos (UN, KG, LT, MT, CJ, etc.).
          </p>
          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm action={createUnit} idPrefix="unit" placeholder="Nueva unidad" />
            </div>
          ) : null}
          <div className="mt-4">
            {units.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Aún no hay unidades.</p>
            ) : (
              units.map((unit) => (
                <CatalogRow key={unit.id} item={unit} action={updateUnit} readOnly={!writable} />
              ))
            )}
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Categorías de producto</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Clasificación para productos (independiente de gastos/ingresos).
          </p>
          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm action={createProductCategory} idPrefix="productCategory" placeholder="Nueva categoría de producto" />
            </div>
          ) : null}
          <div className="mt-4">
            {productCategories.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Aún no hay categorías de producto.</p>
            ) : (
              productCategories.map((cat) => (
                <CatalogRow key={cat.id} item={cat} action={updateProductCategory} readOnly={!writable} />
              ))
            )}
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Bodegas</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Almacenes donde se guarda el stock. La <strong className="font-medium text-foreground">principal</strong>{" "}
            recibe los productos nuevos y no se puede desactivar.
          </p>
          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm action={createWarehouse} idPrefix="warehouse" placeholder="Nueva bodega" />
            </div>
          ) : null}
          <div className="mt-4">
            {warehouses.map((warehouse) => (
              <div key={warehouse.id} className="border-b border-border py-2 last:border-0">
                {warehouse.isDefault ? (
                  <span className="mb-1 inline-block text-[11px] font-semibold uppercase tracking-widest text-primary">
                    Principal
                  </span>
                ) : null}
                <CatalogRow
                  item={{ id: warehouse.id, name: warehouse.name, active: warehouse.active }}
                  action={updateWarehouse}
                  readOnly={!writable}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={cardClass + " p-5"}>
          <h2 className="font-semibold">Medios de pago</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Medios de pago disponibles para facturas de compra.
          </p>

          {writable ? (
            <div className="mt-4">
              <CatalogCreateForm
                action={createPaymentMethod}
                idPrefix="paymentMethod"
                placeholder="Nuevo medio de pago"
              />
            </div>
          ) : null}

          <div className="mt-4">
            {paymentMethods.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Aún no hay medios de pago.</p>
            ) : (
              paymentMethods.map((method) => (
                <CatalogRow
                  key={method.id}
                  item={method}
                  action={updatePaymentMethod}
                  readOnly={!writable}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
