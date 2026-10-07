// Piezas del tema claro de Dashboard y Reportes: paneles, indicadores, tablas,
// estados, barras de avance y paginación. Todo usa la misma paleta neutra con
// un solo acento azul.
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/lib/formato";

export function PageTitle({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className, flush }) {
  return (
    <section
      className={cn(
        "bg-white rounded-xl border border-zinc-200 min-w-0",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </header>
      )}
      <div className={flush ? "" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}

const TONOS_KPI = {
  normal: "bg-white border-zinc-200",
  alerta: "bg-amber-50 border-amber-200",
};

export function Kpi({ label, value, hint, hintTone = "neutral", tone = "normal" }) {
  const hintCls = {
    neutral: "text-zinc-500",
    up: "text-emerald-700",
    down: "text-red-700",
    alerta: "text-amber-800",
  }[hintTone];
  return (
    <div className={cn("rounded-xl border px-5 py-4", TONOS_KPI[tone])}>
      <p
        className={cn(
          "text-xs font-medium",
          tone === "alerta" ? "text-amber-800" : "text-zinc-500",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums mt-1",
          tone === "alerta" ? "text-amber-900" : "text-zinc-900",
        )}
      >
        {value}
      </p>
      {hint && <p className={cn("text-xs mt-1", hintCls)}>{hint}</p>}
    </div>
  );
}

export function Campo({ label, children, className }) {
  return (
    <label className={cn("flex flex-col gap-1 min-w-0", className)}>
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export function BotonExportar({ onClick, disabled, cargando, children = "Exportar Excel" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || cargando}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none"
    >
      {cargando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      {cargando ? "Exportando..." : children}
    </button>
  );
}

export function Boton({ children, onClick, type = "button", variante = "primario", className }) {
  const v = {
    primario: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600",
    secundario: "bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200",
  }[variante];
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-medium", v, className)}
    >
      {children}
    </button>
  );
}

export function Tabla({ children, className }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function FilaMensaje({ cols, children }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-zinc-500">
        {children}
      </td>
    </tr>
  );
}

// --- Estados (caja, cartón, PO, QR y envíos comparten la misma escala)
const ESTADOS = {
  abierta: ["Abierta", "bg-blue-50 text-blue-700 border-blue-200"],
  empacada: ["Empacada", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  pendiente: ["Pendiente", "bg-zinc-100 text-zinc-600 border-zinc-200"],
  en_proceso: ["En proceso", "bg-blue-50 text-blue-700 border-blue-200"],
  completo: ["Completo", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  enviado: ["Enviado", "bg-violet-50 text-violet-700 border-violet-200"],
  cancelado: ["Cancelado", "bg-red-50 text-red-700 border-red-200"],
  error: ["Error", "bg-red-50 text-red-700 border-red-200"],
  disponible: ["Disponible", "bg-zinc-100 text-zinc-600 border-zinc-200"],
  escaneado: ["Escaneado", "bg-blue-50 text-blue-700 border-blue-200"],
  mono_sku: ["Mono SKU", "bg-zinc-100 text-zinc-600 border-zinc-200"],
  musical: ["Musical", "bg-amber-50 text-amber-800 border-amber-200"],
};

export function Estado({ valor }) {
  const [texto, cls] = ESTADOS[valor] || [valor || "—", "bg-zinc-100 text-zinc-600 border-zinc-200"];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap", cls)}>
      {texto}
    </span>
  );
}

export function BarraAvance({ valor, total, className }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div className={cn("h-2 rounded-full bg-zinc-100 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-600" : "bg-blue-600")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Paginacion({ page, pages, total, limit, onPage }) {
  if (!pages || pages <= 1) return null;
  const desde = (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);
  const nums = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);
  if (nums[0] > 1) nums.unshift(1, "…a");
  if (nums.at(-1) < pages) nums.push("…b", pages);
  const btn = "h-8 min-w-8 px-2 rounded-lg text-xs font-medium";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200">
      <p className="text-xs text-zinc-500 tabular-nums">
        {fmtNum(desde)}–{fmtNum(hasta)} de {fmtNum(total)}
      </p>
      <div className="flex items-center gap-1">
        <button className={cn(btn, "text-zinc-600 hover:bg-zinc-100 disabled:opacity-40")} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          <ChevronLeft size={14} />
        </button>
        {nums.map((n) =>
          typeof n === "string" ? (
            <span key={n} className="px-1 text-xs text-zinc-400">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              className={cn(btn, n === page ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100")}
            >
              {n}
            </button>
          ),
        )}
        <button className={cn(btn, "text-zinc-600 hover:bg-zinc-100 disabled:opacity-40")} disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
