"use client";

import { useEffect } from "react";

function toDisplay(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toWire(value: string): string {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!m) return value;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function DateFieldsNormalizer() {
  useEffect(() => {
    const format = () => {
      for (const input of Array.from(document.querySelectorAll('input[data-date="1"]'))) {
        const el = input as HTMLInputElement;
        el.value = toDisplay(el.value);
      }
    };

    format();
    const observer = new MutationObserver(format);
    observer.observe(document.body, { childList: true, subtree: true });

    const handleBeforeSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      for (const el of Array.from(form.querySelectorAll('input[data-date="1"]'))) {
        const input = el as HTMLInputElement;
        const wired = toWire(input.value);
        if (wired !== input.value) input.value = wired;
      }
    };
    document.addEventListener("submit", handleBeforeSubmit, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("submit", handleBeforeSubmit, true);
    };
  }, []);

  return null;
}
