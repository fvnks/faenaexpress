import {
  SUPPORTED_INVOICE_PDF_LANGUAGES,
  type SupportedLanguages,
} from "../../schema";

import { toWords as toWordsEN } from "./en";
import { toWords as toWordsES } from "./es";

/**
 * The number-to-words converter for each language the app offers.
 *
 * `satisfies` is what keeps this honest: adding a language to `SUPPORTED_INVOICE_PDF_LANGUAGES`
 * without a converter here is a type error rather than a runtime hole.
 */
const CONVERTERS = {
  en: toWordsEN,
  es: toWordsES,
} satisfies Record<SupportedLanguages, (value: number) => string>;

/**
 * One less than a trillion, the largest amount these languages carry a scale word for.
 *
 * The words above it are a liability rather than a feature: every language names the big
 * scales differently (a German "Trillion" is 10^18, an English one 10^12), so they are easy
 * to get subtly wrong and impossible to review. We decline past this point instead of
 * spelling out something we cannot vouch for.
 */
export const MAX_SPELLABLE = 999_999_999_999;

/**
 * Spell out a whole, non-negative number in one of the supported languages.
 *
 * This replaces the `n2words` package, which stored its number tables as BigInt literals.
 * BigInt is Safari 14+ *syntax*, so no transpiler could lower it and the chunk it landed in
 * failed to parse outright on older iOS -- taking the whole invoice page with it.
 *
 * @returns The number in words, or `null` when it is above {@link MAX_SPELLABLE}. An amount
 * that large is a legitimate invoice in a currency like VND or IDR, not a bug, so the caller
 * is handed a value to present rather than an exception to report -- see `getAmountInWords`.
 *
 * @throws {Error} If the value is not a whole, non-negative number. Unlike an amount over
 * the cap, that can only be a caller that skipped its own validation.
 */
export function numberToWords({
  value,
  language,
}: {
  /** A whole, non-negative number. */
  value: number;
  /** Which language to spell it out in. */
  language: SupportedLanguages;
}): string | null {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Cannot spell out ${value}: expected a whole, non-negative number.`,
    );
  }

  if (value > MAX_SPELLABLE) {
    return null;
  }

  const convert = CONVERTERS[language];

  if (!convert) {
    throw new Error(
      `No converter for language "${language}". Supported: ${SUPPORTED_INVOICE_PDF_LANGUAGES.join(", ")}.`,
    );
  }

  return convert(value);
}
