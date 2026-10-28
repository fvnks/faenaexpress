export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
          >
            Y
          </span>
          Yellow ERP
        </div>
        <p className="text-sm text-muted-foreground">
          yellow-erp.cl · Hecho en Chile
        </p>
      </div>
    </footer>
  );
}
