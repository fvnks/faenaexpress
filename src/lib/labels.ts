import type {
  CategoryKind,
  DocumentType,
  PartnerType,
  PaymentMethod,
  PaymentStatus,
  Role,
  SaleStatus,
} from "@/generated/prisma/client";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  ACCOUNTANT: "Contabilidad",
  SALES: "Ventas",
  VIEWER: "Solo lectura",
};

// Rol dentro de la organización (Nivel 1), independiente del rol por empresa.
const orgRoleLabels: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  MEMBER: "Miembro",
  BILLING: "Facturación",
};

export function orgRoleLabel(role: string): string {
  return orgRoleLabels[role] ?? role;
}

// Tipos de documento tributario electrónico del SII (campo IdDoc/TipoDTE).
export function dteTipoLabel(tipo: number): string {
  switch (tipo) {
    case 33: return "Factura electrónica";
    case 34: return "Factura exenta";
    case 39: return "Boleta electrónica";
    case 41: return "Boleta exenta";
    case 52: return "Guía de despacho";
    case 56: return "Nota de débito";
    case 61: return "Nota de crédito";
    default: return `Tipo ${tipo}`;
  }
}

const TIPOS_SOPORTADOS = new Set([33, 34, 56]);
const TIPOS_OMITIDOS: Record<number, string> = {
  61: "Nota de crédito (se omite según configuración)",
  39: "Boleta electrónica",
  41: "Boleta exenta",
  52: "Guía de despacho",
};

// null = el tipo se importa; string = motivo por el que se omite.
export function dteMotivoOmision(tipo: number): string | null {
  if (TIPOS_SOPORTADOS.has(tipo)) return null;
  return TIPOS_OMITIDOS[tipo] ?? `Tipo de documento ${tipo} no soportado`;
}

const partnerTypeLabels: Record<PartnerType, string> = {
  CUSTOMER: "Cliente",
  SUPPLIER: "Proveedor",
  BOTH: "Cliente y proveedor",
};

// Tipos de remuneración del módulo RRHH.
export function remunerationTypeLabel(type: string): string {
  switch (type) {
    case "SUELDO": return "Sueldo";
    case "AGUINALDO": return "Aguinaldo";
    case "BONO": return "Bono";
    case "ADELANTO": return "Adelanto";
    default: return "Otro";
  }
}

const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: "Factura",
  RECEIPT: "Boleta",
  CREDIT_NOTE: "Nota de crédito",
  DEBIT_NOTE: "Nota de débito",
  QUOTATION: "Cotización",
  OTHER: "Otro",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  CHECK: "Cheque",
  OTHER: "Otro",
};

const categoryKindLabels: Record<CategoryKind, string> = {
  EXPENSE: "Gasto",
  INCOME: "Ingreso",
  BOTH: "Ambos",
};

// El mismo estado se lee distinto según si es compra o venta.
const purchaseStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendiente de pago",
  PARTIAL: "Pago parcial",
  PAID: "Pagada",
};

const saleStatusLabels: Record<SaleStatus, string> = {
  PENDING: "Por cobrar",
  PAID: "Cobrada",
  PARTIAL: "Parcial",
  OVERDUE: "Vencida",
  CANCELLED: "Anulada",
};

export const auditActionLabels: Record<string, string> = {
  CREATE: "Creación",
  UPDATE: "Edición",
  DELETE: "Eliminación",
  IMPORT: "Importación",
};

export const entityTypeLabels: Record<string, string> = {
  Purchase: "Compra",
  Sale: "Venta",
  Payment: "Abono",
  Expense: "Gasto",
  DispatchGuide: "Guía de despacho",
  Partner: "Tercero",
  Category: "Categoría",
  Area: "Área",
  Salesperson: "Vendedor",
  Payer: "Pagador",
  Product: "Producto",
  StockMovement: "Movimiento de inventario",
  StockCount: "Conteo de inventario",
  Worker: "Trabajador",
  Remuneration: "Remuneración",
  Company: "Empresa",
  Membership: "Usuario de empresa",
  User: "Usuario",
  Unit: "Unidad",
  ProductCategory: "Categoría de producto",
  ProductStock: "Stock de producto",
  Warehouse: "Bodega",
  CommissionAssignment: "Asignación de comisión",
};

export function roleLabel(role: Role): string {
  return roleLabels[role];
}

export function partnerTypeLabel(type: PartnerType): string {
  return partnerTypeLabels[type];
}

export function documentTypeLabel(type: DocumentType): string {
  return documentTypeLabels[type];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return paymentMethodLabels[method];
}

export function categoryKindLabel(kind: CategoryKind): string {
  return categoryKindLabels[kind];
}

export function purchaseStatusLabel(status: PaymentStatus): string {
  return purchaseStatusLabels[status];
}

export function saleStatusLabel(status: SaleStatus): string {
  return saleStatusLabels[status];
}

export const inventoryAccessLabels: Record<string, string> = {
  NONE: "Sin acceso",
  VIEW: "Ver",
  EDIT: "Editar",
};

export function inventoryAccessLabel(value: string): string {
  return inventoryAccessLabels[value] ?? value;
}

export const stockMovementTypeLabels: Record<string, string> = {
  IN: "Entrada",
  OUT: "Salida",
  ADJUST_IN: "Ajuste (+)",
  ADJUST_OUT: "Ajuste (-)",
  WASTE: "Merma / pérdida",
  INITIAL: "Inventario inicial",
  TRANSFER: "Transferencia",
};

export function stockMovementTypeLabel(type: string): string {
  return stockMovementTypeLabels[type] ?? type;
}
