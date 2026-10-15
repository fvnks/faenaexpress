export type PreviredIndicators = Record<string, unknown> | null;

export type PayrollWorkerLike = {
  afp?: string | null;
  contractType?: string | null;
};

function pick(record: unknown, ...paths: string[][]): unknown {
  for (const path of paths) {
    let current: unknown = record;
    for (const key of path) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      const value = (current as Record<string, unknown>)[key];
      if (value === undefined) {
        current = undefined;
        break;
      }
      current = value;
    }
    if (current !== undefined) return current;
  }
  return undefined;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeAfp(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function afpCode(afp: string | null | undefined, key: unknown): string | null {
  const normalized = normalizeAfp(afp);
  const aliases: Record<string, string[]> = {
    capital: ["capital"],
    cuprum: ["cuprum"],
    habitat: ["habitat", "hábitat"],
    planvital: ["planvital", "plan", "vital"],
    provida: ["provida", "vida", "pro"],
    modelo: ["modelo"],
    uno: ["uno"],
  };
  for (const [code, names] of Object.entries(aliases)) {
    if (names.some((name) => normalized.includes(name))) return code;
  }
  if (key && typeof key === "object") {
    const matching = Object.keys(key as Record<string, unknown>).find((candidate) =>
      normalizeAfp(candidate) === normalized || normalizeAfp(candidate).includes(normalized),
    );
    if (matching) return matching;
  }
  return null;
}

export async function fetchPreviredIndicators(year: number, month: number): Promise<PreviredIndicators> {
  const token = process.env.PREVIRED_API_TOKEN;
  if (!token) return null;

  const base = process.env.PREVIRED_API_BASE_URL ?? "https://apigateway.cl/api/v2/previred/indicadores/data";
  const period = `${year}${String(month).padStart(2, "0")}`;
  const url = base.endsWith("/") ? `${base}${period}` : `${base}/${period}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`No se pudieron obtener los indicadores previsionales (${response.status}).`);
  }
  const data = await response.json();
  return data as PreviredIndicators;
}

function indicatorsRoot(indicators: PreviredIndicators): Record<string, unknown> | undefined {
  if (!indicators || typeof indicators !== "object") return undefined;
  const data = indicators as Record<string, unknown>;
  const nested = pick(
    data,
    ["data", "attributes", "indicadores"],
    ["data", "indicadores"],
    ["indicadores"],
  );
  if (nested && typeof nested === "object") return nested as Record<string, unknown>;
  if (data.data && typeof data.data === "object") return data.data as Record<string, unknown>;
  return data;
}

export function resolvePayrollRates(
  indicators: PreviredIndicators,
  worker: PayrollWorkerLike,
  fallback: { afpRate: number; healthRate: number; unemploymentRate: number; anualBonusRate: number },
): { afpRate: number; healthRate: number; unemploymentRate: number; anualBonusRate: number } {
  const root = indicatorsRoot(indicators);
  if (!root) {
    return {
      afpRate: fallback.afpRate,
      healthRate: fallback.healthRate,
      unemploymentRate: fallback.unemploymentRate,
      anualBonusRate: fallback.anualBonusRate,
    };
  }

  const afpFunds = pick(root, ["afp", "fondos"]) as Record<string, unknown> | undefined;
  const afpCodeValue = afpCode(worker.afp, afpFunds);
  const afpFund = afpCodeValue ? (afpFunds?.[afpCodeValue] as Record<string, unknown> | undefined) : undefined;
  const apiAfpRate =
    numberFrom(afpFund?.tasa_dependiente) ??
    numberFrom(afpFund?.tasa_trabajador) ??
    numberFrom(afpFund?.tasa);

  const apiHealthRate = numberFrom(pick(root, ["salud", "tasa"])) ?? fallback.healthRate;

  const unemploymentSection = pick(root, ["seguro_cesantia", "seguroCesantia", "afc"]) as Record<string, unknown> | undefined;
  const normalizedContract = (worker.contractType ?? "").toLowerCase();
  let apiUnemploymentRate = fallback.unemploymentRate;
  if (unemploymentSection) {
    if (normalizedContract.includes("fijo") || normalizedContract.includes("fixed")) {
      apiUnemploymentRate =
        numberFrom(pick(unemploymentSection, ["plazo_fijo", "trabajador"])) ??
        numberFrom(unemploymentSection.plazo_fijo_trabajador) ??
        0;
    } else {
      const employeeRate =
        numberFrom(pick(unemploymentSection, ["plazo_indefinido", "trabajador"])) ??
        numberFrom(unemploymentSection.plazo_indefinido_trabajador) ??
        fallback.unemploymentRate;
      apiUnemploymentRate = employeeRate;
    }
  }

  return {
    afpRate: apiAfpRate ?? fallback.afpRate,
    healthRate: apiHealthRate,
    unemploymentRate: apiUnemploymentRate,
    anualBonusRate: fallback.anualBonusRate,
  };
}