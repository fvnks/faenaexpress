/**
 * Cliente HTTP del ERP Defontana.
 *
 * Defontana no publica una API abierta, pero su propio front (el módulo "Nova"
 * de Compras y el de Ventas) usa estos endpoints, que se replican aquí tal
 * cual: login del portal, un único token de sesión que dura un año y el
 * listado/descarga de los documentos. El detalle del circuito está en
 * AGENTS.md.
 *
 * Flujo:
 *   1. `EmailLogin` (correo + clave) → token de portal.
 *   2. `SetProductLogin` → cookie `access_token` (el token de sesión del ERP).
 *   3. `getMasterData` → configuración de la empresa en Defontana.
 *   4. Listado:
 *      - compras: `queryERPDocuments` (GraphQL) → filas con `DocumentPlatformId`.
 *      - ventas: `getSalesByCompany` (otro GraphQL) → filas con `documentId`.
 *   5. `purchase/getdte?id=<platformId|documentId>` → el XML DTE.
 *      (el mismo endpoint de compras sirve también para los ids de ventas).
 *
 * El mismo token sirve para el GraphQL (como `authorization` pelado) y para la
 * API REST (como `bearer <token>`).
 */

const PORTAL_API = "https://portal-api.defontana.com";
const APPSYNC_COMPRAS =
  "https://2za6uxb6mzedvlaacgqjycm77e.appsync-api.us-east-1.amazonaws.com/graphql";
const APPSYNC_VENTAS =
  "https://nyaybczuqrbvrg6g6xo3x5brqm.appsync-api.us-east-1.amazonaws.com/graphql";
// El endpoint de descarga de XML es el mismo para compras y ventas.
const XML_DOWNLOAD_API = "https://compras.defontana.com/ComprasApi";

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

const SALES_QUERY = `query GetSalesByCompany(
  $companyId: String!
  $dateFrom: AWSDate
  $dateTo: AWSDate
  $limit: Int
  $nextToken: String
  $clientSearch: String
  $docSearch: String
  $folioFrom: String
  $folioTo: String
  $sortBy: SaleSortField
  $sortOrder: String
) {
  getSalesByCompany(
    companyId: $companyId
    dateFrom: $dateFrom
    dateTo: $dateTo
    limit: $limit
    nextToken: $nextToken
    clientSearch: $clientSearch
    docSearch: $docSearch
    folioFrom: $folioFrom
    folioTo: $folioTo
    sortBy: $sortBy
    sortOrder: $sortOrder
  ) {
    items {
      folio
      firstFolio
      lastFolio
      documentId
      documentType
      documentName
      emissionDate
      dueDate
      clientRut
      clientName
      status
      eCode
      total
      documentOrigin
    }
    totalCount
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

// Tope de espera de las llamadas al ERP: antes, si Defontana no contestaba, el
// botón quedaba girando hasta que el servidor cortaba por su cuenta. El XML va
// aparte porque puede tardar más que una consulta.
const TIMEOUT_MS = 20_000;
const TIMEOUT_XML_MS = 30_000;

/**
 * `fetch` contra Defontana con tope de tiempo y errores traducidos a
 * `DefontanaError`: sin esto, un timeout o un corte de red llegaban al usuario
 * como un genérico «revisa las credenciales», que no era el problema.
 */
async function fetchDefontana(
  url: string,
  init: RequestInit,
  context: string,
  timeoutMs: number = TIMEOUT_MS,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new DefontanaError(
        `Defontana tardó más de ${Math.round(timeoutMs / 1000)} s en responder al ${context}. Vuelve a intentarlo.`,
      );
    }
    throw new DefontanaError(`No se pudo conectar con Defontana al ${context}.`);
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
  tipoId: string; // "FCA", "FCA2", "FVAELECT"…
  rutTercero: string; // proveedor (compras) o cliente (ventas)
  nombreTercero: string;
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
    await fetchDefontana(
      `${PORTAL_API}/api/Account/EmailLogin?Email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      {},
      "iniciar sesión",
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
    await fetchDefontana(
      `${PORTAL_API}/api/Product/GetProductsByCompanyAndUser?expirationDate=${encodeURIComponent(expirationDate)}`,
      { headers: bearer },
      "abrir el producto",
    ),
    "abrir el producto",
  );

  const cuenta = await readJson(
    await fetchDefontana(
      `${PORTAL_API}/api/Account/GetUsersFromAccount?itemsPerPage=5&pageNumber=0`,
      { headers: bearer },
      "leer los usuarios de la cuenta",
    ),
    "leer los usuarios de la cuenta",
  );
  const usuario = obj(arr(cuenta.users)[0]);
  const userId = str(usuario.user) || "001";

  const sesion = await fetchDefontana(
    `${PORTAL_API}/api/Product/SetProductLogin?Code=5&userID=${encodeURIComponent(userId)}&expirationDate=${encodeURIComponent(expirationDate)}`,
    { headers: bearer },
    "abrir el ERP",
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

async function graphql(
  token: string,
  endpoint: string,
  query: string,
  variables: Json,
): Promise<Json> {
  const response = await fetchDefontana(
    endpoint,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: token },
      body: JSON.stringify({ query, variables }),
    },
    "consultar documentos",
  );
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
  const respuesta = await graphql(token, APPSYNC_COMPRAS, MASTER_DATA_QUERY, {});
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
 * Documentos del Libro de Compras. El rango de emisión es obligatorio; el folio
 * acota la búsqueda en el servidor.
 *
 * Ojo con `proveedor`: el ERP lo compara exacto contra el RUT *tal como lo tiene
 * guardado*, y lo guarda unas veces con puntos («94.668.000-1») y otras sin
 * ellos («76056614-4»). Mandarlo normalizado deja la búsqueda en cero filas, así
 * que no se envía nunca: el RUT del proveedor se verifica en el llamador.
 */
export async function listPurchaseDocuments(
  token: string,
  masterData: DefontanaMasterData,
  filtro: {
    desde: string;
    hasta: string;
    folio?: string | null;
    limite?: number;
  },
): Promise<DefontanaDocumento[]> {
  const folio = filtro.folio?.trim() ?? "";
  const respuesta = await graphql(token, APPSYNC_COMPRAS, ERP_DOCUMENTS_QUERY, {
    input: {
      start: 0,
      length: filtro.limite ?? 500,
      filters: {
        proveedor: null,
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
      rutTercero: str(row.ProviderLegalCode),
      nombreTercero: str(row.ProviderName),
      fecha: str(row.DocumentEmissionDate).slice(0, 10),
      total: num(row.DocumentTotal),
      platformId: str(row.DocumentPlatformId),
    };
  });
}

/**
 * Documentos del módulo de Ventas. El `folio` acota en el servidor.
 *
 * Igual que en compras, no se envía `clientSearch` con el RUT: el ERP no lo
 * cruza contra el RUT guardado (da cero filas). El RUT del cliente se verifica
 * en el llamador sobre las filas que llegan.
 */
export async function listSaleDocuments(
  token: string,
  masterData: DefontanaMasterData,
  filtro: {
    desde: string;
    hasta: string;
    folio?: string | null;
    limite?: number;
  },
): Promise<DefontanaDocumento[]> {
  const folio = filtro.folio?.trim() ?? "";
  const respuesta = await graphql(token, APPSYNC_VENTAS, SALES_QUERY, {
    companyId: masterData.companyConfig.companyId,
    dateFrom: filtro.desde,
    dateTo: filtro.hasta,
    limit: filtro.limite ?? 500,
    clientSearch: null,
    docSearch: null,
    folioFrom: folio,
    folioTo: folio,
    sortBy: "DATE",
    sortOrder: "DESC",
  });

  return arr(obj(obj(respuesta.data).getSalesByCompany).items).map((item) => {
    const row = obj(item);
    return {
      folio: str(row.folio),
      tipoSii: str(row.eCode),
      tipoId: str(row.documentType),
      rutTercero: str(row.clientRut),
      nombreTercero: str(row.clientName),
      fecha: str(row.emissionDate).slice(0, 10),
      // El total viene con formato local (ej. "273,700" = 273.700 CLP): se toma
      // el número entero quitando cualquier separador de miles (comas o puntos).
      // Para montos en pesos enteros esto es correcto; si hubiera decimales
      // habría que afinar la lógica, pero los XML DTE traen MntTotal entero.
      total: parseInt(str(row.total).replace(/[^0-9]/g, ""), 10) || 0,
      platformId: str(row.documentId),
    };
  });
}

/**
 * XML DTE de un documento (compra o venta: el mismo endpoint sirve para los
 * dos tipos de id). Se devuelve como `Buffer` para respetar su codificación.
 */
export async function downloadXml(token: string, platformId: string): Promise<Buffer> {
  const response = await fetchDefontana(
    `${XML_DOWNLOAD_API}/api/purchase/getdte?id=${encodeURIComponent(platformId)}`,
    { headers: { authorization: `Bearer ${token}` } },
    "pedir el XML",
    TIMEOUT_XML_MS,
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
