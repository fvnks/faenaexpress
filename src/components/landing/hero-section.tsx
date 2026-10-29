"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

import GradientASCIIRaw from "@/components/ui/GradientASCII.jsx";
import { primaryButtonClass } from "@/lib/ui";

const GradientASCII = GradientASCIIRaw as React.FC<Record<string, unknown>>;

type MockupType = "compras" | "ventas" | "gastos" | "reportes" | "banco" | "rrhh";

const MOCKUPS: Record<MockupType, {
  title: string;
  subtitle: string;
  cards: Array<{ label: string; value: string; trend?: string }>;
  tableHeaders: Array<string>;
  tableRows: Array<Array<string>>;
  icon: string;
}> = {
  compras: {
    title: "Libro de Compras",
    subtitle: "Facturas de proveedores y estado de pago",
    cards: [
      { label: "Por pagar", value: "$2.480.000", trend: "+12%" },
      { label: "Pagado mes", value: "$890.000", trend: "-5%" },
      { label: "Vencidas", value: "12", trend: "+2" },
      { label: "Proveedores", value: "43", trend: "+1" },
    ],
    tableHeaders: ["Folio", "Proveedor", "Fecha", "Vencimiento", "Monto", "Estado"],
    tableRows: [
      ["F-872263", "Comercial del Sur Ltda.", "25/10", "10/11", "$446.375", "Pendiente"],
      ["F-1031", "Insumos Andes SpA", "27/10", "12/11", "$119.000", "Pagada"],
      ["F-5502", "Transportes RÃ­o Ltda.", "26/10", "11/11", "$238.000", "Pendiente"],
      ["F-0089", "Ferretería El Clavo", "25/10", "09/11", "$56.700", "Pagada"],
      ["F-3341", "DistribuciÃ³n Central", "24/10", "08/11", "$712.500", "Pendiente"],
    ],
    icon: "🧾",
  },
  ventas: {
    title: "Libro de Ventas",
    subtitle: "Facturas emitidas y estado de cobro",
    cards: [
      { label: "Por cobrar", value: "$3.120.000", trend: "+8%" },
      { label: "Cobrado hoy", value: "$450.000", trend: "+15%" },
      { label: "Vencidas", value: "8", trend: "-1" },
      { label: "Clientes", value: "67", trend: "+3" },
    ],
    tableHeaders: ["Folio", "Cliente", "Fecha", "Vencimiento", "Monto", "Estado"],
    tableRows: [
      ["B-4421", "Consumidor final", "28/10", "28/10", "$15.400", "Pagada"],
      ["F-9912", "Constructora XYZ Ltda.", "27/10", "11/11", "$1.250.000", "Pendiente"],
      ["F-3045", "Distribuciones ABC SpA", "26/10", "10/11", "$680.000", "Pagada"],
      ["F-7731", "Retail Mayorista S.A.", "25/10", "09/11", "$2.100.000", "Pendiente"],
      ["F-1105", "Servicios Integrales SPA", "24/10", "08/11", "$890.000", "Pendiente"],
    ],
    icon: "🧾",
  },
  gastos: {
    title: "Gastos Operacionales",
    subtitle: "Gastos por área con pagador y reembolso",
    cards: [
      { label: "Gastos mes", value: "$980.000", trend: "+6%" },
      { label: "Por reembolsar", value: "$120.000", trend: "+4%" },
      { label: "Pagados", value: "$860.000", trend: "-2%" },
      { label: "Categorías", value: "12", trend: "0" },
    ],
    tableHeaders: ["Concepto", "Pagador", "Fecha", "Monto", "Estado"],
    tableRows: [
      ["Servicios bÃ¡sicos", "María González", "28/10", "$85.000", "Pagado"],
      ["Transporte logística", "Carlos Méndez", "27/10", "$45.000", "Pendiente"],
      ["Suministros oficina", "María González", "26/10", "$32.000", "Pagado"],
      ["Viáticos comercial", "Andrés Rojas", "25/10", "$120.000", "Por reembolsar"],
      ["ImpresiÃ³n y papel", "Lucía FernÃ¡ndez", "24/10", "$18.500", "Pendiente"],
    ],
    icon: "💸",
  },
  reportes: {
    title: "Estado de Resultados",
    subtitle: "Resumen mensual y comparativo",
    cards: [
      { label: "Ingresos totales", value: "$5.200.000", trend: "+12%" },
      { label: "Gastos totales", value: "$3.100.000", trend: "+4%" },
      { label: "Utilidad bruta", value: "$2.100.000", trend: "+18%" },
      { label: "Margen", value: "40.4%", trend: "+2.1%" },
    ],
    tableHeaders: ["Mes", "Ingresos", "Gastos", "Utilidad", "Margen"],
    tableRows: [
      ["Enero 2026", "$4.800.000", "$2.900.000", "$1.900.000", "39.6%"],
      ["Febrero 2026", "$5.200.000", "$3.100.000", "$2.100.000", "40.4%"],
      ["Marzo 2026", "$4.900.000", "$2.800.000", "$2.100.000", "42.9%"],
      ["Abril 2026", "$5.600.000", "$3.400.000", "$2.200.000", "39.3%"],
    ],
    icon: "📊",
  },
  banco: {
    title: "ConciliaciÃ³n Bancaria",
    subtitle: "Movimientos bancarios y estado de conciliaciÃ³n",
    cards: [
      { label: "Sin conciliar", value: "$1.250.000", trend: "+3%" },
      { label: "Conciliado", value: "$8.400.000", trend: "-1%" },
      { label: "Diferencias", value: "3", trend: "0" },
      { label: "Cuentas", value: "4", trend: "0" },
    ],
    tableHeaders: ["Fecha", "Glosa", "Monto", "Tipo", "Estado"],
    tableRows: [
      ["28/10", "Traspaso a Cuenta:008178288402", "-$500.000", "Traspaso", "Ignorado"],
      ["27/10", "Pago proveedor Comercial del Sur", "-$446.375", "Salida", "Pendiente"],
      ["26/10", "DepÃ³sito cliente Constructora XYZ", "+$1.250.000", "Entrada", "Conciliado"],
      ["25/10", "Compra materiales oficina", "-$89.500", "Salida", "Pendiente"],
      ["24/10", "Cobro factura Servicios Integrales", "+$890.000", "Entrada", "Conciliado"],
    ],
    icon: "🏦",
  },
  rrhh: {
    title: "Remuneraciones",
    subtitle: "Trabajadores, sueldos y pagos de octubre",
    cards: [
      { label: "Trabajadores", value: "24", trend: "+1" },
      { label: "Pago mensual", value: "$12.400.000", trend: "+5%" },
      { label: "Pendientes", value: "0", trend: "0" },
      { label: "Contratos", value: "22", trend: "+2" },
    ],
    tableHeaders: ["Trabajador", "RUT", "Concepto", "Monto lÃ­quido", "Fecha"],
    tableRows: [
      ["María González", "12.345.678-9", "Sueldo octubre", "$850.000", "28/10"],
      ["Carlos Méndez", "9.876.543-2", "Sueldo octubre", "$720.000", "28/10"],
      ["Andrés Rojas", "7.654.321-5", "Sueldo octubre", "$950.000", "28/10"],
      ["Lucía FernÃ¡ndez", "6.543.210-1", "Bono producciÃ³n", "$300.000", "28/10"],
      ["Diego Silva", "5.432.109-8", "Aguinaldo", "$450.000", "28/10"],
    ],
    icon: "👥",
  },
};

function MockupContent() {
  const [mockup, setMockup] = useState<MockupType>("compras");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const types: MockupType[] = ["compras", "ventas", "gastos", "reportes", "banco", "rrhh"];
    setMockup(types[Math.floor(Math.random() * types.length)]);
    setVisible(true);
  }, []);

  const m = MOCKUPS[mockup];

  if (!visible) return null;

  return (
    <>
      {/* Mockup al final, centrado y más ancho */}
      <div className="mx-auto max-w-6xl mb-10 sm:mb-12">
        <div className="relative">
          {/* Card de dashboard */}
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#0d1b2e] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-[100px] opacity-30" />

            {/* Header del mockup */}
            <div className="relative z-10 flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                  <span className="text-lg">{m.icon}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{m.title}</h3>
                  <p className="text-[10px] text-white/70">{m.subtitle}</p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-white/70">
                28/10/2026 · 14:32
              </div>
            </div>

            {/* KPI Cards */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4">
              {m.cards.map((card) => (
                <div
                  key={card.label}
                  className="flex flex-col gap-1 rounded-xl border border-white/20 bg-white/10 p-3"
                >
                  <p className="text-[9px] font-semibold text-white/90 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className="text-sm font-bold text-white tabular-nums">
                      {card.value}
                    </p>
                    {card.trend && (
                      <span className={`text-[9px] font-bold ${card.trend.startsWith('+') ? 'text-primary' : card.trend.startsWith('-') ? 'text-accent' : 'text-white/50'}`}>
                        {card.trend}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla */}
            <div className="relative z-10 overflow-x-auto px-6 pb-6">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-[9px] font-semibold text-white/80 uppercase tracking-wider">
                    Últimos movimientos
                  </span>
                  <span className="text-[10px] text-white/70 font-mono">
                    Última actualización: hace 2 min
                  </span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {m.tableHeaders.map((h, i) => (
                        <th
                          key={i}
                          className={`px-4 py-3 text-[9px] font-semibold text-white/80 uppercase tracking-wider ${
                            i === 0 ? "text-left" : i === m.tableHeaders.length - 1 ? "text-right" : "text-center"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {m.tableRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-white/5 bg-white/3 hover:bg-white/10 transition-colors"
                      >
                        {row.map((cell, cIdx) => {
                          const isEstado = cIdx === row.length - 1;
                          const isMonto = cIdx === row.length - 2;
                          return (
                            <td
                              key={cIdx}
                              className={`px-4 py-2.5 ${
                                cIdx === 0
                                  ? "text-left text-white font-medium truncate w-[80px]"
                                  : isEstado
                                  ? "text-right font-bold w-[70px]"
                                  : isMonto
                                  ? "text-right tabular-nums font-bold text-white w-[70px]"
                                  : "text-center text-white/80 min-w-[60px] truncate"
                              }`}
                            >
                              {isEstado ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  cell === "Pagada" || cell === "Pagado" || cell === "Conciliado"
                                    ? "bg-primary/10 border border-primary/20 text-primary"
                                    : cell === "Pendiente" || cell === "Por reembolsar"
                                    ? "bg-accent/10 border border-accent/20 text-accent"
                                    : cell === "Ignorado"
                                    ? "bg-white/10 border border-white/20 text-white/70"
                                    : "bg-white/10 border border-white/20 text-white/70"
                                }`}>
                                  {cell}
                                </span>
                              ) : (
                                cell
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function HeroSection() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { href: "#que-hace", label: "Qué hace" },
    { href: "#plataforma", label: "Plataforma" },
    { href: "/contacto", label: "Contacto" },
  ];

  return (
    <section className="relative pb-24 overflow-hidden">
      {/* Fondo envolvente oscuro (estilo Wope) */}
      <div className="absolute inset-0 z-0 bg-background" />
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-soft rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-accent-soft rounded-full blur-[120px] opacity-40" />
      </div>
      {/* GradientASCII animado sobre el fondo */}
      <div className="absolute inset-0 z-20 h-[700px] w-full">
        <div className="h-full w-full">
          <GradientASCII
            colors={["#1B5FA8", "#4A9FD8", "#8A5408", "#E0A94A"]}
            shape="horizon"
            characters=" =+xX0S8#@"
            cellSize={22}
            density={0.6}
            glyphOpacity={0.4}
            glow={0.15}
            depthOfField={0}
            flicker={0.1}
            softness={0.6}
            scale={1.2}
            flow={0.4}
            speed={0.8}
            gradientOpacity={0.5}
            grain={0.03}
            variation={0.1}
            mouseInteraction
            scrambleRadius={0.08}
            clickEffect="wave"
            intro
            lightMode={false}
          />
        </div>
      </div>

      {/* Navbar */}
      <nav className="relative z-30 py-4 md:py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black"
              >
                Y
              </span>
              Yellow ERP
            </Link>
          </div>

          <div className="lg:hidden ml-2">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex w-10 h-10 items-center justify-center rounded-control border border-border bg-surface"
              aria-label="Abrir menú"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground"
              >
                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <ul className="hidden lg:flex ml-8 lg:w-auto lg:space-x-8">
            {navLinks.map((link) => (
              <li key={link.href} className="group relative">
                <Link
                  href={link.href}
                  className="inline-block text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block ml-auto flex items-center gap-10">
            <Link
              href="/login"
              className="relative group inline-block px-6 py-2.5 text-sm font-semibold text-muted-foreground border border-border bg-surface rounded-control overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary-soft transform translate-x-full group-hover:translate-x-0 transition duration-500" />
              <span className="relative">Entrar</span>
            </Link>
            <a
              href="/login"
              className="relative group inline-block px-6 py-2.5 text-sm font-semibold text-accent hover:text-white border border-accent overflow-hidden rounded-control"
            >
              <div className="absolute inset-0 bg-accent transform translate-x-full group-hover:translate-x-0 transition duration-500" />
              <span className="relative">Crear cuenta</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-30 mx-auto max-w-5xl px-6 pt-12 sm:pt-16 lg:pt-20 pb-16">
        <div className="text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary-soft bg-primary-soft text-primary text-xs font-medium uppercase tracking-wider mb-4 inline-block">
            ERP para empresas chilenas
          </span>

          {/* H1 centrado con palabras resaltadas */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold text-foreground leading-tight mb-6 sm:mb-8 relative">
            Deja de perseguir <span className="text-accent">facturas</span> en
            <span className="text-primary">Excel</span>.
          </h1>

          {/* Párrafo debajo del H1 con palabras resaltadas */}
          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed mb-8 sm:mb-10 max-w-2xl sm:max-w-none mx-auto">
            Registra <span className="text-primary font-semibold">compras</span>,
            <span className="text-accent font-semibold">ventas</span> y{" "}
            <span className="text-primary font-semibold">gastos</span> en
            minutos, concilia el{" "} <span className="text-accent font-semibold">
              banco
            </span>{" "}
            y ten siempre claro quién pagó cada gasto. Montos en pesos, IVA al
            19 %, todo en español.
          </p>

          {/* CTAs debajo del párrafo */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16">
            <Link
              href="/login"
              className="relative group inline-block w-full sm:w-auto py-4 px-8 text-white font-semibold rounded-control bg-accent overflow-hidden text-center sm:text-left shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/50 transition-shadow"
            >
              <div
                className="absolute inset-0 bg-[#0d1b2e] transform translate-x-full group-hover:translate-x-0 transition duration-500"
              />
              <div className="relative flex items-center justify-center gap-2">
                <span className="group-hover:text-white transition-colors">Entrar a mi cuenta</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.25 3.75L3.75 11.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.25 11.25L3.75 3.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Link>
            <Link
              href="#que-hace"
              className="relative group inline-block w-full sm:w-auto py-4 px-8 text-sm font-semibold text-foreground border border-border bg-surface overflow-hidden text-center sm:text-left"
            >
              <div className="absolute inset-0 bg-primary-soft transform translate-x-full group-hover:translate-x-0 transition duration-500" />
              <div className="relative flex items-center justify-center gap-2">
                <span>Ver de qué se trata</span>
              </div>
            </Link>
          </div>

          {/* Mockup al final, centrado y más ancho */}
          <MockupContent />
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 ${mobileNavOpen ? "block" : "hidden"}`}
      >
        <div
          onClick={() => setMobileNavOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        <nav className="absolute inset-y-0 left-0 z-30 w-full max-w-md bg-surface border-r border-border flex flex-col py-6 px-6 shadow-2xl">
          <div className="flex items-center justify-between mb-16">
            <Link href="/" className="mr-auto text-2xl font-medium leading-none">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-400 text-[13px] font-bold text-black mr-2"
              >
                Y
              </span>
              Yellow ERP
            </Link>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar menú"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-foreground"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div>
            <ul className="mb-2 space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="block py-4 px-5 rounded-control text-sm text-foreground hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="block py-4 px-5 rounded-control text-sm text-foreground hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  Entrar
                </Link>
              </li>
            </ul>
            <div className="py-8 px-6 mb-6 border-t border-b border-border">
              <a
                href="/contacto"
                className="flex items-center gap-3 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                <svg
                  width="18"
                  height="16"
                  viewBox="0 0 18 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-accent"
                >
                  <path
                    d="M17.3337 6.05833C17.2811 5.9059 17.1854 5.77202 17.0582 5.67292C16.931 5.57381 16.7777 5.51374 16.617 5.5L11.8754 4.80833L9.75038 0.499999C9.68215 0.359106 9.5756 0.240284 9.44296 0.157143C9.31031 0.074003 9.15693 0.0299072 9.00039 0.0299072C8.84384 0.0299072 8.69046 0.074003 8.55781 0.157143C8.42517 0.240284 8.31862 0.359106 8.25039 0.499999L6.12539 4.8L1.38372 5.5C1.22949 5.52192 1.08449 5.58663 0.96518 5.6868C0.845868 5.78696 0.757021 5.91856 0.708721 6.06666C0.664509 6.21139 0.660541 6.36543 0.697245 6.51224C0.733948 6.65905 0.809936 6.7931 0.917055 6.9L4.35872 10.2333L3.52539 14.9667C3.49564 15.1229 3.51121 15.2844 3.57028 15.432C3.62935 15.5797 3.72943 15.7074 3.85872 15.8C3.98474 15.8901 4.13337 15.9433 4.28793 15.9536C4.44249 15.9639 4.59686 15.9309 4.73372 15.8583L9.00039 13.6333L13.2504 15.8667C13.3673 15.9326 13.4994 15.9671 13.6337 15.9667C13.8102 15.9673 13.9824 15.9118 14.1254 15.8083C14.2547 15.7157 14.3548 15.588 14.4138 15.4404C14.4729 15.2927 14.4885 15.1312 14.4587 14.975L13.6254 10.2417L17.067 6.90833C17.1874 6.8064 17.2763 6.67242 17.3235 6.52195C17.3707 6.37149 17.3742 6.21073 17.3337 6.05833ZM12.2087 9.39166C12.111 9.48619 12.0379 9.6032 11.9957 9.73247C11.9536 9.86175 11.9438 9.99937 11.9671 10.1333L12.5671 13.625L9.43372 11.9583C9.31315 11.8941 9.17865 11.8605 9.04205 11.8605C8.90546 11.8605 8.77095 11.8941 8.65039 11.9583L5.51705 13.625L6.11705 10.1333C6.14033 9.99937 6.13048 9.86175 6.08836 9.73247C6.04623 9.6032 5.97312 9.48619 5.87539 9.39166L3.37539 6.89166L6.88372 6.38333C7.01872 6.36455 7.14705 6.31295 7.25747 6.23304C7.36789 6.15313 7.45702 6.04736 7.51705 5.925L9.00039 2.75L10.5671 5.93333C10.6271 6.0557 10.7162 6.16147 10.8266 6.24137C10.9371 6.32128 11.0654 6.37289 11.2004 6.39166L14.7087 6.9L12.2087 9.39166Z"
                    fill="currentColor"
                  />
                </svg>
                <span>Drop us a line</span>
              </a>
            </div>
            <div className="flex px-6 mb-16 items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <a
                href="/login"
                className="inline-block py-3 px-4 text-sm font-semibold text-accent hover:text-white border border-accent rounded-control transition duration-200"
              >
                Crear cuenta
              </a>
            </div>
          </div>
        </nav>
      </div>
    </section>
  );
}
