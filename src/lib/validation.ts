import { z } from "zod";

import { isValidRut } from "@/lib/rut";

export const loginSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }).trim(),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
});

// Los enums se declaran como literales para validar sin depender del runtime de Prisma.
export const documentTypeValues = [
  "INVOICE",
  "RECEIPT",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "QUOTATION",
  "OTHER",
] as const;

export const paymentMethodValues = [
  "CASH",
  "TRANSFER",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "CHECK",
  "OTHER",
] as const;

export const paymentStatusValues = ["PENDING", "PAID"] as const;
export const partnerTypeValues = ["CUSTOMER", "SUPPLIER", "BOTH"] as const;
export const categoryKindValues = ["EXPENSE", "INCOME", "BOTH"] as const;
export const commissionRuleValues = ["INVOICE", "GUIDE"] as const;

const emptyToUndefined = (value: unknown) =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "")
    ? undefined
    : value;

const amount = z.coerce
  .number({ error: "Ingresa un monto válido." })
  .int({ error: "El monto va en pesos, sin decimales." })
  .min(0, { error: "El monto no puede ser negativo." });

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalRut = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(20)
    .refine((value) => isValidRut(value), { error: "El RUT no es válido (revisa el dígito verificador)." })
    .optional(),
);

const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date({ error: "Fecha inválida." }).optional());

// Las notas de crédito y débito ajustan un documento: hay que indicar su folio.
function requireReference(
  value: { documentType?: string; referenceDocumentNumber?: string },
  ctx: z.RefinementCtx,
) {
  if (
    (value.documentType === "CREDIT_NOTE" || value.documentType === "DEBIT_NOTE") &&
    !value.referenceDocumentNumber
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["referenceDocumentNumber"],
      message: "Ingresa el folio del documento que ajusta esta nota.",
    });
  }
}

export const purchaseSchema = z.object({
  partnerId: z.string().min(1, { error: "Selecciona un proveedor." }),
  categoryId: z.preprocess(emptyToUndefined, z.string().optional()),
  areaId: z.preprocess(emptyToUndefined, z.string().optional()),
  documentType: z.preprocess(
    emptyToUndefined,
    z.enum(documentTypeValues, { error: "Selecciona el tipo de documento." }).default("INVOICE"),
  ),
  documentNumber: optionalText(50),
  referenceDocumentNumber: optionalText(50),
  date: z.coerce.date({ error: "Ingresa la fecha del documento." }),
  dueDate: optionalDate,
  description: optionalText(300),
  netAmount: amount,
  ivaAmount: amount,
  status: z.enum(paymentStatusValues, { error: "Selecciona el estado." }),
  paymentMethod: z.preprocess(emptyToUndefined, z.enum(paymentMethodValues).optional()),
  paymentDate: optionalDate,
  notes: optionalText(1000),
}).superRefine(requireReference);

export const saleSchema = z.object({
  partnerId: z.string().min(1, { error: "Selecciona un cliente." }),
  categoryId: z.preprocess(emptyToUndefined, z.string().optional()),
  areaId: z.preprocess(emptyToUndefined, z.string().optional()),
  documentType: z.preprocess(
    emptyToUndefined,
    z.enum(documentTypeValues, { error: "Selecciona el tipo de documento." }).default("INVOICE"),
  ),
  documentNumber: optionalText(50),
  referenceDocumentNumber: optionalText(50),
  date: z.coerce.date({ error: "Ingresa la fecha de emisión." }),
  salespersonId: z.preprocess(emptyToUndefined, z.string().optional()),
  purchaseOrder: optionalText(80),
  dispatchGuide: optionalText(80),
  hesNumber: optionalText(80),
  netAmount: amount,
  ivaAmount: amount,
  retentionAmount: z.preprocess(emptyToUndefined, amount.optional()),
  status: z.enum(paymentStatusValues, { error: "Selecciona el estado." }),
  paymentDate: optionalDate,
  confirmingAt: optionalDate,
  notes: optionalText(1000),
}).superRefine(requireReference);

export const expenseSchema = z.object({
  date: z.coerce.date({ error: "Ingresa la fecha del gasto." }),
  description: z.string().trim().min(1, { error: "Ingresa una descripción." }).max(300),
  categoryId: z.preprocess(emptyToUndefined, z.string().optional()),
  areaId: z.preprocess(emptyToUndefined, z.string().optional()),
  workerId: z.preprocess(emptyToUndefined, z.string().optional()),
  documentNumber: optionalText(50),
  paymentMethod: z.enum(paymentMethodValues, { error: "Selecciona el tipo de pago." }),
  netAmount: amount,
  ivaAmount: amount,
  paidById: z.string().min(1, { error: "Selecciona quién pagó el gasto." }),
  reimbursed: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
  reimbursedAt: optionalDate,
  notes: optionalText(1000),
});

export const partnerSchema = z.object({
  type: z.enum(partnerTypeValues, { error: "Selecciona el tipo." }),
  name: z.string().trim().min(1, { error: "Ingresa el nombre." }).max(120),
  rut: optionalRut,
  email: z.preprocess(
    emptyToUndefined,
    z.email({ error: "Ingresa un correo válido." }).trim().optional(),
  ),
  phone: optionalText(40),
  address: optionalText(200),
  notes: optionalText(500),
  salespersonId: optionalText(50),
  active: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type PartnerInput = z.infer<typeof partnerSchema>;

const nameActiveSchema = z.object({
  name: z.string().trim().min(1, { error: "Ingresa un nombre." }).max(80),
  active: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});

export const areaSchema = nameActiveSchema;
export const payerSchema = nameActiveSchema;
export const paymentMethodCatalogSchema = nameActiveSchema;

// La tasa llega del formulario como "2,5" o "3" y se guarda en centésimas
// (250, 300). Se rechaza lo que no sea un porcentaje razonable.
export const salespersonSchema = nameActiveSchema.extend({
  commissionRate: z.preprocess(
    (value) => {
      const raw = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
      if (raw === "") return 0;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : NaN;
    },
    z
      .number()
      .min(0, { error: "El porcentaje no puede ser negativo." })
      .max(100, { error: "El porcentaje no puede superar 100%." })
      // Se captura como porcentaje legible (2,5) y se guarda en centésimas (250).
      .transform((value) => Math.round(value * 100)),
  ),
  // El formulario de Catálogos no lo envía todavía: se asume por factura.
  commissionRule: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? "INVOICE" : value),
    z.enum(commissionRuleValues, {
      error: "Selecciona la regla de comisión.",
    }),
  ),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, { error: "Ingresa un nombre." }).max(80),
  kind: z.enum(categoryKindValues, { error: "Selecciona el tipo." }),
  active: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
});

export const roleValues = ["ADMIN", "ACCOUNTANT", "SALES", "VIEWER"] as const;

export const stockMovementTypeValues = [
  "IN",
  "OUT",
  "ADJUST_IN",
  "ADJUST_OUT",
  "WASTE",
  "INITIAL",
  "TRANSFER",
] as const;

export const remunerationTypeValues = ["SUELDO", "AGUINALDO", "BONO", "ADELANTO", "OTRO"] as const;

// Trabajador del módulo RRHH: nombre + RUT (validado módulo 11 si viene).
export const rrhhWorkerSchema = z.object({
  name: z.string().trim().min(1, { error: "Ingresa el nombre." }).max(120),
  rut: optionalRut,
  active: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
  position: optionalText(120),
  areaId: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.email({ error: "Ingresa un correo válido." }).trim().optional()),
  phone: optionalText(40),
  address: optionalText(180),
  city: optionalText(80),
  birthDate: optionalDate,
  hireDate: optionalDate,
  terminationDate: optionalDate,
  contractType: optionalText(80),
  status: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  baseAmount: z.preprocess(emptyToUndefined, amount.optional()),
  bankName: optionalText(80),
  bankAccount: optionalText(80),
  afp: optionalText(80),
  healthPlan: optionalText(80),
  notes: optionalText(500),
});

// Pago de remuneración: registros libres (tipo + período opcional + monto líquido).
export const remunerationSchema = z.object({
  workerId: z.string().min(1, { error: "Selecciona el trabajador." }),
  type: z.enum(remunerationTypeValues, { error: "Selecciona el tipo de pago." }),
  period: z.preprocess(
    (value) => {
      const text = String(value ?? "").trim();
      return text === "" ? undefined : text;
    },
    z.string().regex(/^\d{4}-\d{2}$/, { error: "El período debe ser AAAA-MM." }).optional(),
  ),
  date: z.coerce.date({ error: "Ingresa la fecha de pago." }),
  amount: amount,
  paidById: z.string().min(1, { error: "Selecciona quién pagó." }),
  paymentMethod: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? "CASH" : value),
    z.enum(paymentMethodValues, { error: "Selecciona el medio de pago." }),
  ),
  notes: optionalText(500),
});

export const absenceTypeValues = ["SICK", "VACATION", "PERSONAL", "UNPAID", "OTHER"] as const;
export const absenceStatusValues = ["PENDING", "APPROVED", "REJECTED"] as const;

export const rrhhAbsenceSchema = z.object({
  workerId: z.string().min(1, { error: "Selecciona el trabajador." }),
  type: z.enum(absenceTypeValues, { error: "Selecciona el tipo de ausencia." }),
  status: z.enum(absenceStatusValues, { error: "Selecciona el estado." }).default("PENDING"),
  startDate: z.coerce.date({ error: "Ingresa la fecha de inicio." }),
  endDate: z.coerce.date({ error: "Ingresa la fecha de término." }),
  paid: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()),
  reason: optionalText(200),
  notes: optionalText(500),
});
export type RemunerationInput = z.infer<typeof remunerationSchema>;

export const companySchema = z.object({
  name: z.string().trim().min(1, { error: "Ingresa el nombre de la empresa." }).max(120),
  rut: optionalRut,
  address: optionalText(200),
  city: optionalText(80),
  email: z.preprocess(
    emptyToUndefined,
    z.email({ error: "Ingresa un correo válido." }).trim().optional(),
  ),
  phone: optionalText(40),
  ivaRate: z.coerce
    .number({ error: "Ingresa el IVA." })
    .int({ error: "El IVA es un porcentaje entero." })
    .min(0, { error: "El IVA no puede ser negativo." })
    .max(100, { error: "El IVA no puede superar 100." })
    .default(19),
  retentionRate: z.coerce
    .number({ error: "Ingresa la retención." })
    .int({ error: "La retención es un porcentaje entero." })
    .min(0, { error: "La retención no puede ser negativa." })
    .max(100, { error: "La retención no puede superar 100." })
    .default(0),
  afpRate: z.coerce.number().int().min(0).max(100).default(10),
  healthRate: z.coerce.number().int().min(0).max(100).default(7),
  unemploymentRate: z.coerce.number().int().min(0).max(100).default(1),
  anualBonusRate: z.coerce.number().int().min(0).max(100).default(0),
});

function baseNameSchemaFactory() {
  return z.object({
    name: z
      .string({ error: "Ingresa un nombre." })
      .trim()
      .min(1, { error: "Ingresa un nombre." })
      .max(80, { error: "El nombre es demasiado largo." }),
    active: z.preprocess((value) => value === "on" || value === "true", z.boolean().default(true)),
  });
}

export const unitSchema = baseNameSchemaFactory();
export const productCategorySchema = baseNameSchemaFactory();
export const warehouseSchema = baseNameSchemaFactory();

export const memberSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }).trim(),
  role: z.enum(roleValues, { error: "Selecciona un rol." }),
});

export const newUserSchema = z.object({
  name: z.string().trim().min(1, { error: "Ingresa el nombre." }).max(120),
  email: z.email({ error: "Ingresa un correo válido." }).trim(),
  password: z.string().min(8, { error: "La contraseña debe tener al menos 8 caracteres." }).max(100),
  role: z.enum(roleValues, { error: "Selecciona un rol." }),
});

export type CompanyInput = z.infer<typeof companySchema>;
