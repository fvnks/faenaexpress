import Link from "next/link";

// La marca de la plataforma, para las pantallas de entrada.
//
// Estaba repetida (con el mismo SVG y las mismas clases) en el login, la
// invitación, el 2FA y el perfil. Vive acá para que la puerta de entrada se
// cambie en un solo lugar.

export function PlatformMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-base font-semibold tracking-tight"
      aria-label="Yellow ERP — inicio"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          {/* Tres trazos que suben: los módulos de la plataforma. */}
          <path d="M4 18h16" />
          <path d="M7 18v-6" />
          <path d="M12 18V8" />
          <path d="M17 18v-3" />
        </svg>
      </span>
      {compact ? null : "Yellow ERP"}
    </Link>
  );
}

// La marca de un colegio en su propia puerta de entrada. No dice el nombre de la
// plataforma a propósito: la familia tiene que reconocer el colegio, no al
// proveedor del software.
export function SchoolMark({ name }: { name: string }) {
  const iniciales = name
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
        {iniciales || "C"}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-tight tracking-tight">{name}</span>
        <span className="block text-xs text-muted-foreground">Portal del apoderado</span>
      </span>
    </div>
  );
}
