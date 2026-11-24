# Plan: Yellow ERP Obras

**Módulo nuevo** de la plataforma Yellow ERP, para constructoras, empresas de montaje e
ingeniería en Chile. Escrito el 24-11-2026 a partir de una revisión del mercado chileno
(Flexline, Builtek, Laudus, Sisip, Control ObraX, Conprojecto, Geves, OneMake, ConstruIT)
y de cómo se presupuesta y cobra una obra en Chile.

---

## 0. Decisiones tomadas (24-11-2026)

| Decisión | Elegido | Por qué |
| --- | --- | --- |
| ¿Dónde vive? | **Módulo nuevo en este repo**, al mismo nivel que Facturas, Colegios y POS | La plataforma multi-tenant (organización, planes con límites, 2FA, auditoría, consola, proxy, selector de módulos) ya está construida y endurecida. Un repo aparte serían 2–3 semanas de plataforma repetida. |
| ¿A quién se le vende? | **Constructora pequeña/mediana (5–50 personas)** y empresas de montaje industrial | Es el segmento que hoy está en Excel + WhatsApp y decide rápido. Las grandes ya tienen SAP/Odoo con consultora. |
| ¿Qué resuelve primero? | **Presupuesto por partidas vs. costo real** | Es el dolor #1 en el mercado ("presupuesto obligado vs. real", "margen desglosado") y es donde la plataforma ya tiene las piezas: compras, gastos con pagador, bodega e IVA. |
| ¿Cómo se factura la obra? | **Estados de pago** progresivos, no factura única | En construcción se cobra el avance aprobado por el ITO/mandante. Es la diferencia con una venta normal y lo que ningún ERP genérico hace bien. |
| ¿Aislamiento? | **Por obra**, con cookie propia (`obras_obra`), paralela a la de empresa y a la de colegio | Igual que Colegios: `ObraMembership` → `Obra`. Un usuario puede estar en Facturas, Colegios y Obras a la vez. |
| ¿Esquema de Prisma? | **Una sola sección marcada en `schema.prisma`** | Misma razón que Colegios: no voy a tocar el pipeline de migraciones de producción por reorganizar archivos. |

**Pendiente de responder** (no bloquea los cimientos): nombre comercial del módulo, si el primer
release incluye app móvil para registro de avance en terreno o basta la web responsive, y si
los estados de pago se emiten como DTE desde el día uno o se dejan como documento interno.

---

## 1. Qué vende un ERP de obras en Chile

Consenso del mercado (fuentes: Flexline, Control ObraX, Laudus, Sisip, ConstruIT, Geves):

| Área | Contenido |
| --- | --- |
| Presupuesto | **Itemizado por partidas** con código, unidad, cantidad, precio unitario y total. **APU** (análisis de precios unitarios): materiales, mano de obra, maquinaria y gastos generales por partida. |
| Control de costos | **Obligado vs. real** por partida y por obra. Costo real desde compras de materiales, estados de pago a subcontratistas, sueldos y maquinaria. Margen desglosado. |
| Avance | **Avance físico** medido en unidades contra la cubicación del itemizado (no "80% porque sí"). **Curva S** y comparación avance físico vs. financiero. |
| Estados de pago | Documento con el que se cobra la obra ejecutada por períodos, aprobado por ITO/mandante. Se genera desde las partidas presentadas a pago. |
| Subcontratos | Asignación de partidas del presupuesto a cada contratista, adelantos/anticipos, préstamos, retenciones y su propio estado de pago. |
| Bodega de obra | Ingresos, salidas y consumos por obra, con traspasos entre bodega central y obra. |
| Maquinaria | Horómetros, kilometraje, mantenciones programadas, arriendos. |
| Terceros y documentos | Contratos, orden de compra, facturas, boletas, certificados, planos. |

**Conclusión estratégica:** el diferencial no es "tener un presupuesto" (eso lo tiene cualquiera),
es **que el costo real llegue solo desde los documentos que ya se registran en Facturas** —una
compra, un gasto con pagador, un abono— y que el estado de pago se arme con el mismo itemizado,
sin digitar dos veces. Eso es exactamente lo que un ERP genérico no hace y lo que aquí sale gratis.

---

## 2. Vocabulario y reglas del dominio

Estos son los términos que debe usar la UI (no inventar otros):

- **Obra** — proyecto con mandante, dirección, fecha de inicio/termino y presupuesto vigente.
- **Partida** — ítem del itemizado: `código`, `unidad`, `cantidad`, `precio unitario`, `total`.
- **APU** — análisis de precios unitarios de una partida: materiales + mano de obra + maquinaria + gastos generales.
- **Cubicación** — medición física ejecutada de una partida.
- **Avance físico** — `cubicado / presupuestado` (en unidades), no una sensación.
- **Estado de pago (EP)** — cobro progresivo por períodos sobre partidas ejecutadas y aprobadas.
- **Subcontrato** — contrato con un tercero sobre un conjunto de partidas.
- **Obligado** — presupuesto aprobado. **Real** — costo efectivo. **Desviación** — real − obligado.

**Reglas de oro** (equivalentes a las de `lib/ledger.ts` en Facturas):
1. El total de la obra = suma de partidas. El avance financiero = suma de EP aprobados.
2. Una partida anulada no cuenta; se conserva con su motivo para auditoría.
3. El costo real de una partida se **deriva** de los documentos vinculados, nunca se escribe a mano.
4. El estado de pago no se Factura automáticamente: es un documento de control que el usuario
   convierte en venta/DTE cuando el mandante lo aprueba (el PDF precursor ya existe en el repo).

---

## 3. Arquitectura: módulo en esta plataforma, no proyecto aparte

Mismo razonamiento que `PLAN-COLEGIOS.md` §3, con una diferencia: Obras **sí reutiliza datos de
Facturas** (compras, gastos, terceros, bodega), así que el acoplamiento es una virtud.

1. **Registro**: entrada en `ORG_MODULES` (`code: "obras"`, `sections: []`, `core: false`) y en
   `ALL_MODULES` (`src/lib/modules.ts`) con `hasAccess` y `pendings` propios. Con 2+ módulos,
   el login pasa por `/modulos`: la mecánica ya está hecha.
2. **Ámbito propio**: `src/lib/obra-auth.ts`, paralelo a `school-auth.ts`:
   - `ObraMembership` (usuario ↔ obra, rol) y cookie `obras_obra`.
   - `visibleObras(user)`, `resolveActiveObra(user)`, `requireObraContext(sección?)`.
   - Aislamiento por `obraId` en **todas** las consultas, igual que `companyId` hoy.
3. **Permisos propios**: `src/lib/obra-permissions.ts` con `ACCESS`/`WRITE` por sección, como
   `school-permissions.ts`. Roles: `ADMIN_OBRA`, `CAPATAZ`, `CONTADOR`, `VISUALIZADOR`.
   El corte va en las Server Actions (son alcanzables por POST directo).
4. **Consola**: `/admin/obras` para crear obra y asignar equipo, con el mismo patrón de
   `/admin/colegios`. La auditoría va a `PlatformAudit`.
5. **Planes y módulos por organización**: `syncPlanModules` debe listar `obras`; hay que correr
   una vez el script equivalente a `planes-agregar-facturas.ts` para que los planes actuales lo
   incluyan (si no, se deshabilita al guardar un plan).
6. **Selector de módulos**: el `MODULE_COOKIE` sugiere la última obra usada igual que hoy sugiere
   el último módulo; el switcher de obras vive en el header de `/obras`, no en `/facturas`.

---

## 4. Modelo de datos (nuevas tablas, sección marcada en schema.prisma)

| Modelo | Campos clave | Propósito |
| --- | --- | --- |
| `Obra` | `organizationId`, `name`, `code`, `mandante`, `direccion`, `fechaInicio`, `fechaTermino`, `estado`, `presupuestoVigenteId?` | Proyecto |
| `ObraMembership` | `userId`, `obraId`, `role`, `active` | Acceso por obra |
| `Partida` | `obraId`, `codigo`, `unidad`, `cantidad`, `precioUnitario`, `total`, `estado`, `partidaPadreId?`, `orden` | Itemizado (jerárquico por capítulos) |
| `Apu` | `partidaId`, `tipo` (MATERIAL/MANO_OBRA/MAQUINARIA/GGEN), `descripcion`, `cantidad`, `precioUnitario`, `total` | Análisis de precios unitarios |
| `Cubicacion` | `partidaId`, `fecha`, `cantidad`, `registradoById`, `aprobada`, `aprobadaById` | Avance físico medido |
| `EstadoPago` | `obraId`, `numero`, `periodo`, `estado` (BORRADOR/APROBADO/PAGADO), `total`, `saleId?` | Cobro progresivo |
| `EstadoPagoPartida` | `estadoPagoId`, `partidaId`, `cantidad`, `precioUnitario`, `total` | Detalle del EP |
| `Subcontrato` | `obraId`, `partnerId`, `numero`, `total`, `anticipo`, `retencionPct` | Contrato con tercero |
| `SubcontratoPartida` | `subcontratoId`, `partidaId`, `cantidad`, `precioUnitario` | Partidas asignadas |
| `CostoObra` | `obraId`, `partidaId?`, `sourceType` (PURCHASE/EXPENSE/PAYMENT/PAYROLL), `sourceId`, `monto`, `fecha` | Costo real **derivado** (UNIQUE por source) |
| `BodegaObra` / `MovimientoBodegaObra` | `obraId`, `productId`, `cantidad`, `origen`, `destino` | Consumos y traspasos |
| `Maquinaria` / `Horometro` | `obraId`, `nombre`, `horas`, `km`, `mantenciones` | Equipos |

Tablas de apoyo: `PlantillaItemizado` (partidas estándar reutilizables) y `ObraAudit` o reutilizar
`AuditLog` con `entityType: "Obra"|"Partida"|"EstadoPago"`.

---

## 5. Qué se reutiliza de Facturas (y qué NO se duplica)

| Necesidad de Obras | Viene de | Cómo se conecta |
| --- | --- | --- |
| Compras de materiales | `Purchase` | Al guardar una compra con `obraId`, se crea `CostoObra` (sourceType PURCHASE) |
| Gastos con pagador | `Expense` | Igual: `CostoObra` (EXPENSE). Se conserva "quién pagó" —el diferencial de la plataforma |
| Terceros | `Partner` | El mandante y los subcontratistas son `Partner` con rol |
| Bodega | `Product`/`StockMovement` | `MovimientoBodegaObra` referencia el producto; no se duplica el catálogo |
| DTE / PDF | `lib/dte-typedte.ts`, `lib/pdf/` | El estado de pago aprobado se convierte en `Sale` y usa el PDF existente |
| IVA y libros | `lib/ledger.ts` | Las ventas que nacen de EP entran al Libro de ventas y al cuadre IVA |
| Auditoría, planes, 2FA, consola | plataforma | Tal cual, sin cambios |

**No se duplica**: el catálogo de productos, los terceros, el motor de IVA, el PDF ni la facturación
electrónica. Obras es una **capa de control** encima de los documentos que ya existen.

---

## 6. Fases de entrega

### Fase 0 — Cimientos (plataforma)
- Registro en `ORG_MODULES` + `ALL_MODULES`, plan, script de planes, `/admin/obras`,
  `ObraMembership`, `obra-auth.ts`, `obra-permissions.ts`, selector de obras en el header,
  layout `/obras` con el mismo lenguaje visual (índice de catálogo, franja de cobre, grid).
- **Entregable:** entrar a `/obras`, crear una obra, cambiar entre obras, permisos por rol.

### Fase 1 — Presupuesto y costo real (el MVP vendible)
- Alta de obra, itemizado jerárquico con APU, importación del presupuesto desde Excel
  (el usuario ya trae su presupuesto en planilla —el repo ya tiene `exceljs`).
- Vista **Obligado vs. Real** por partida con desviación y margen.
- `CostoObra` derivado de compras/gastos con `obraId`.
- **Entregable:** el usuario ve, por partida, cuánto presupuestó y cuánto gastó realmente.

### Fase 2 — Avance y estados de pago
- Cubicaciones con aprobación (ITO), avance físico, curva S.
- Estados de pago generados desde partidas ejecutadas, aprobación y conversión a `Sale`/DTE.
- **Entregable:** cobrar por avance sin digitar dos veces.

### Fase 3 — Subcontratos y bodega de obra
- Subcontratos con partidas asignadas, anticipos, retenciones y su EP.
- Bodega por obra con traspasos desde la central.
- **Entregable:** control completo del costo de obra.

### Fase 4 — Terreno y maquinaria
- Registro de avance desde móvil responsive (fotos por partida), horómetros y mantenciones.
- Reportes: curva S, desviación presupuestaria, productividad por cuadrilla.

---

## 7. Riesgos y decisiones pendientes

| Riesgo | Mitigación |
| --- | --- |
| El itemizado del usuario está en Excel con formatos raros | Importación tolerante + vista previa antes de guardar (patrón ya usado en plantillas de factura) |
| Los costos reales no llegan si el usuario no asocia la compra a la obra | El formulario de compra/gasto ofrece la obra activa; recordatorio en el panel si hay documentos sin imputar |
| Un estado de pago se factura dos veces | `EstadoPago.saleId` con UNIQUE y bloqueo en la acción (igual que las devoluciones POS) |
| Crecimiento del schema (ya tiene 40+ tablas) | Sección marcada + migración propia; no multi-archivo por el bug de Prisma 7.0 |
| Confusión con el módulo Facturas | Copy claro: Obras **controla** la obra; Facturas **emite** los documentos. El EP se convierte en venta, no se duplica |

---

## 8. Precio sugerido

Referencias chilenas: ERP de construcción desde 3–6 UF/mes (Builtek, Flexline, Laudus).
Propuesta: **4 UF/mes por obra activa**, o **6 UF/mes ilimitado** para constructoras con varias
obras. El módulo se vende **además** de Facturas (que ya se contrata aparte).
