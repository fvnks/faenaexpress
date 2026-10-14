"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
    >
      Imprimir
    </button>
  );
}
