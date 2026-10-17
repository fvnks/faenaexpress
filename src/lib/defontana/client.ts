/**
 * Cliente HTTP del ERP Defontana.
 *
 * Defontana no publica una API abierta, pero su propio front (el módulo "Nova"
 * de compras) usa estos endpoints, que se replican aquí tal cual: login del
 * portal, un único token de sesión que dura un año y el listado/descarga del
 * Libro de Compras. El detalle del circuito está en AGENTS.md.
 *
 * Flujo:
 *   1. `EmailLogin` (correo + clave) → token de portal.
 *   2. `SetProductLogin` → cookie `access_token` (el token de sesión del ERP).
 *   3. `getMasterData` → configuración de la empresa en Defontana.
 *   4. `queryERPDocuments` (GraphQL) → documentos, con su `DocumentPlatformId`.
 *   5. `purchase/getdte?id=<DocumentPlatformId>` → el XML DTE.
 *
 * El mismo token sirve para el GraphQL (como `authorization` pelado) y para la
 * API REST (como `bearer <token>`).
 */

const PORTAL_API = "https://portal-api.defontana.com";
const APPSYNC_API =
  "https://2za6uxb6mzedvlaacgqjycm77e.appsync-api.us-east-1.amazonaws.com/graphql";
const COMPRAS_API = "https://compras.defontana.com/ComprasApi";

const MASTER_DATA_QUERY = `query GetMasterData {
  getMasterData {
    companyConfig { companyId legalCode electronicInvoiceModel usesElectronicInvoice mainCurrencyId mainCurrencySymbol mainCurrencyDecimals }
    cateringConfig { useCatering clientId }
    currencies { code symbol decimals }
    providerAccounts
    timestamp
  }
}`;

const ERP_DOCUMENTS_QUERY = `query QueryERPDocuments($input: QueryERPDocumentsInput!) {
  queryERPDocuments(input: $input) {
    recordsTotal recordsFiltered
    data { DocumentNumber DocumentTypeId ProviderLegalCode ProviderName DocumentEmissionDate DocumentTotal DocumentPlatformId SiiDocumentType }
  }
}`;

export class DefontanaError extends Error {
  readonly authFailed: boolean;

  constructor(message: string, options: { authFailed?: boolean } = {}) {
    super(message);
    this.name = "DefontanaError";
    this.authFailed = options.authFailed ?? false;
  }
}

export type DefontanaSession = { token: string; expiresAt: Date };

export type DefontanaMasterData = {
  companyConfig: {
    companyId: string;
    legalCode: string;
    electronicInvoiceModel: string;
    usesElectronicInvoice: boolean;
    mainCurrencyId: string;
    mainCurrencySymbol: string;
    mainCurrencyDecimals: number;
  };
  currencies: { code: string; symbol: string; decimals: number }[];
  providerAccounts: string[];
  useCatering: boolean;
};

export type DefontanaDocumento = {
  folio: string;
  tipoSii: string; // "33", "34", "61"…
  tipoId: string; // "FCA", "FCA2", "NCE"…
  rutProveedor: string;
  nombreProveedor: string;
  fecha: string; // AAAA-MM-DD
  total: number;
  platformId: string;
};

type Json = Record<string, unknown>;

function obj(value: unknown): Json {
  return value && typeof value === "object" ? (value as Json) : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** `exp` del JWT, en segundos. Los tokens de Defontana son JWT sin firmar para nosotros. */
function jwtExpiration(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

async function readJson(response: Response, context: string): Promise<Json> {
  const text = await response.text();
  if (response.status === 401 || response.status === 403) {
    throw new DefontanaError("Defontana rechazó la sesión.", { authFailed: true });
  }
  if (!response.ok) {
    throw new DefontanaError(`Defontana respondió ${response.status} al ${context}.`);
  }
  try {
    return JSON.parse(text) as Json;
  } catch {
    throw new DefontanaError(`Defontana entregó una respuesta ilegible al ${context}.`);
  }
}

/** `Set-Cookie` de la respuesta: el `?` es por si el runtime no expone `getSetCookie`. */
function accessTokenFromCookies(headers: Headers): string | null {
  const cookies = headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    const match = /(?:^|;\s*)access_token=([^;]+)/.exec(cookie);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/** Login del portal + sesión del ERP. Devuelve el token con su vencimiento (un año). */
export async function loginDefontana(email: string, password: string): Promise<DefontanaSession> {
  const login = await readJson(
    await fetch(
      `${PORTAL_API}/api/Account/EmailLogin?Email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    ),
    "iniciar sesión",
  );

  const portalToken = str(login.token);
  if (!portalToken) {
    throw new DefontanaError(
      str(login.message) || "Defontana no aceptó el usuario o la clave.",
      { authFailed: true },
    );
  }

  const bearer = { authorization: `Bearer ${portalToken}` };
  const expirationDate = new Date(jwtExpiration(portalToken) * 1000).toISOString();

  await readJson(
    await fetch(
      `${PORTAL_API}/api/Product/GetProductsByCompanyAndUser?expirationDate=${encodeURIComponent(expirationDate)}`,
      { headers: bearer },
    ),
    "abrir el producto",
  );

  const cuenta = await readJson(
    await fetch(`${PORTAL_API}/api/Account/GetUsersFromAccount?itemsPerPage=5&pageNumber=0`, {
      headers: bearer,
    }),
    "leer los usuarios de la cuenta",
  );
  const usuario = obj(arr(cuenta.users)[0]);
  const userId = str(usuario.user) || "001";

  const sesion = await fetch(
    `${PORTAL_API}/api/Product/SetProductLogin?Code=5&userID=${encodeURIComponent(userId)}&expirationDate=${encodeURIComponent(expirationDate)}`,
    { headers: bearer },
  );
  if (!sesion.ok) {
    throw new DefontanaError(`Defontana respondió ${sesion.status} al abrir el ERP.`);
  }

  const token = accessTokenFromCookies(sesion.headers);
  if (!token) {
    throw new DefontanaError("Defontana no entregó el token de la sesión del ERP.");
  }
  return { token, expiresAt: new Date(jwtExpiration(token) * 1000) };
}

async function graphql(token: string, query: string, variables: Json): Promise<Json> {
  const response = await fetch(APPSYNC_API, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await readJson(response, "consultar documentos");
  const errores = arr(json.errors);
  if (errores.length > 0) {
    const primero = obj(errores[0]);
    const mensaje = str(primero.message);
    if (/not authorized|unauthorized/i.test(mensaje)) {
      throw new DefontanaError("Defontana rechazó la sesión.", { authFailed: true });
    }
    throw new DefontanaError(mensaje || "Defontana devolvió un error al consultar documentos.");
  }
  return json;
}

/** Configuración de la empresa en Defontana (incluye su RUT: `legalCode`). */
export async function getMasterData(token: string): Promise<DefontanaMasterData> {
  const respuesta = await graphql(token, MASTER_DATA_QUERY, {});
  const data = obj(obj(respuesta.data).getMasterData);
  const company = obj(data.companyConfig);
  if (!str(company.companyId)) {
    throw new DefontanaError("Defontana no entregó la configuración de la empresa.");
  }
  return {
    companyConfig: {
      companyId: str(company.companyId),
      legalCode: str(company.legalCode),
      electronicInvoiceModel: str(company.electronicInvoiceModel),
      usesElectronicInvoice: Boolean(company.usesElectronicInvoice),
      mainCurrencyId: str(company.mainCurrencyId),
      mainCurrencySymbol: str(company.mainCurrencySymbol),
      mainCurrencyDecimals: num(company.mainCurrencyDecimals),
    },
    currencies: arr(data.currencies).map((item) => {
      const currency = obj(item);
      return {
        code: str(currency.code),
        symbol: str(currency.symbol),
        decimals: num(currency.decimals),
      };
    }),
    providerAccounts: arr(data.providerAccounts).map(str),
    useCatering: Boolean(obj(data.cateringConfig).useCatering),
  };
}

/**
 * Documentos del Libro de Compras. Todo es opcional salvo el rango de emisión,
 * que el ERP exige siempre; el folio y el proveedor acotan la búsqueda en el
 * servidor (si el folio no filtra bien, el llamador puede reintentar sin él).
 */
export async function listPurchaseDocuments(
  token: string,
  masterData: DefontanaMasterData,
  filtro: {
    desde: string;
    hasta: string;
    rutProveedor?: string | null;
    folio?: string | null;
    limite?: number;
  },
): Promise<DefontanaDocumento[]> {
  const folio = filtro.folio?.trim() ?? "";
  const respuesta = await graphql(token, ERP_DOCUMENTS_QUERY, {
    input: {
      start: 0,
      length: filtro.limite ?? 50,
      filters: {
        proveedor: filtro.rutProveedor?.trim() || null,
        numeroDesde: folio,
        numeroHasta: folio,
        fechaEmision: `${filtro.desde}@${filtro.hasta}`,
        tipoDoc: null,
        tipoIngreso: null,
        onlyERP: null,
        recepcionArticulos: null,
        periodoLibro: null,
        fechaIngreso: null,
      },
      masterData: {
        companyConfig: masterData.companyConfig,
        currencies: masterData.currencies,
        providerAccounts: masterData.providerAccounts,
        useCatering: masterData.useCatering,
      },
    },
  });

  return arr(obj(obj(respuesta.data).queryERPDocuments).data).map((item) => {
    const row = obj(item);
    return {
      folio: str(row.DocumentNumber),
      tipoSii: str(row.SiiDocumentType),
      tipoId: str(row.DocumentTypeId),
      rutProveedor: str(row.ProviderLegalCode),
      nombreProveedor: str(row.ProviderName),
      fecha: str(row.DocumentEmissionDate).slice(0, 10),
      total: num(row.DocumentTotal),
      platformId: str(row.DocumentPlatformId),
    };
  });
}

/** XML DTE de un documento de compra. Se devuelve como `Buffer` para respetar su codificación. */
export async function downloadPurchaseXml(token: string, platformId: string): Promise<Buffer> {
  const response = await fetch(
    `${COMPRAS_API}/api/purchase/getdte?id=${encodeURIComponent(platformId)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (response.status === 401 || response.status === 403) {
    throw new DefontanaError("Defontana rechazó la sesión.", { authFailed: true });
  }
  if (!response.ok) {
    throw new DefontanaError(`Defontana respondió ${response.status} al pedir el XML.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const head = buffer.subarray(0, 4000).toString("latin1");
  if (!/<EnvioDTE|<DTE[\s>]/.test(head)) {
    throw new DefontanaError("Defontana no entregó un XML DTE para ese documento.");
  }
  return buffer;
}
