import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buscarParaReset, desasociarCaja, resetCaja, resetCarton, resetPO } from "@/api/reset";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermisos } from "@/hooks/usePermisos";
import PageHeader from "@/components/layout/PageHeader";
import AutorizarReseteoModal from "@/components/admin/AutorizarReseteoModal";
import { Trash2, AlertTriangle, Box, Package, FileText, CheckCircle2, XCircle, Loader2, Search, X, Unlink } from "lucide-react";

// Cada pestaña aparece si el perfil tiene alguno de sus permisos.
const TABS = [
  { key: "caja",   label: "Caja",   icon: Box,      placeholder: "Escanea o escribe el código de la caja, o un SKU", permisos: ["reset.caja", "reset.desasociar"] },
  { key: "carton", label: "Cartón", icon: Package,  placeholder: "Escanea o escribe el cartón, o un número de PO", permisos: ["reset.carton"] },
  { key: "po",     label: "PO",     icon: FileText, placeholder: "Escribe el número de PO", permisos: ["reset.po"] },
];

const ADVERTENCIA = {
  caja: "Se borrarán todos los escaneos de la caja y sus QRs volverán a estado disponible. Sus pares salen de los cartones donde estén y esos cartones vuelven a pendiente.",
  carton: "Se borrarán los escaneos de Embarque del cartón, se desligarán sus cajas (vuelven a empacada) y el cartón vuelve a pendiente.",
  po: "Se resetearán todos los cartones y cajas de la PO. Los QRs volverán a estado disponible y la PO a pendiente.",
  desasociar: "Los pares de la caja salen de los cartones donde están (también los repartidos par por par o en musicales por PO) y esos cartones vuelven a pendiente. La caja sigue empacada con sus QRs escaneados, lista para volver a asignarse.",
};

const ESTADO_COLORS = {
  abierta:   "text-blue-700",
  empacada:  "text-emerald-700",
  pendiente: "text-zinc-600",
  en_proceso:"text-amber-700",
  completo:  "text-emerald-700",
  enviado:   "text-violet-700",
  cancelado: "text-red-700",
};

// Una línea de detalle por tipo, para distinguir resultados con códigos parecidos.
function detalle(tipo, r) {
  if (tipo === "caja") {
    const enCartones = r.carton_id
      ? `cartón ${r.carton_id} (PO ${r.po_number})`
      : r.pares_en_cartones > 0
        ? `${r.pares_en_cartones} pares en cartones (PO ${r.pos_por_par})`
        : "sin cartón";
    return `${r.sku_number} · ${r.escaneados}/${r.cantidad_pares} pares · ${enCartones} · ${r.fecha}`;
  }
  if (tipo === "carton")
    return `PO ${r.po_number} · ${r.tipo} · ${r.pares_esperados} pares`;
  return `${r.cartones_completos}/${r.total_cartones} cartones completos · ${Number(r.cantidad_pares).toLocaleString()} pares`;
}

export default function ResetPage() {
  const qc = useQueryClient();
  const { puede, alguno } = usePermisos();
  // Sin el permiso "reset.sin_gafete", cada reset pide el gafete de un supervisor.
  const requiereGafete = !puede("reset.sin_gafete");
  const tabs = TABS.filter((t) => alguno(t.permisos));
  const [tabElegida, setTab]    = useState(null);
  const tab = tabs.some((t) => t.key === tabElegida) ? tabElegida : tabs[0]?.key;
  const [texto, setTexto]       = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [accion, setAccion]     = useState(null); // "reset" | "desasociar"
  const [result, setResult]     = useState(null);
  const q = useDebounce(texto, 250);

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ["reset-buscar", tab, q],
    queryFn: () => buscarParaReset(tab, q).then((r) => r.data),
    enabled: !seleccion,
  });

  function ejecutar(datos) {
    if (accion === "desasociar") return desasociarCaja(seleccion.id, datos);
    if (tab === "caja")   return resetCaja(seleccion.id, datos);
    if (tab === "carton") return resetCarton(seleccion.id, datos);
    return resetPO(seleccion.id, datos);
  }

  function hecho(data) {
    setResult({ ok: true, titulo: accion === "desasociar" ? "Caja desasociada" : "Reset completado", data });
    setAccion(null);
    setSeleccion(null);
    qc.invalidateQueries();
  }

  // Desasociar: la caja sale de sus cartones pero conserva su escaneo de
  // Producción, para volver a asignarla (por ejemplo, si se abre o corrige).
  const puedeDesasociar =
    tab === "caja" && seleccion && puede("reset.desasociar") &&
    (seleccion.carton_id || seleccion.pares_en_cartones > 0);
  const puedeResetear = !!seleccion && puede(`reset.${tab}`);

  function handleTabChange(key) {
    setTab(key);
    setTexto("");
    setSeleccion(null);
    setAccion(null);
    setResult(null);
  }

  function elegir(r) {
    setSeleccion(r);
    setAccion(null);
    setResult(null);
  }

  const tabActual = TABS.find((t) => t.key === tab);
  if (!tabActual) return null;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <PageHeader
        title="Reset de asociaciones"
        description={
          requiereGafete
            ? "Borra los escaneos y resetea estados de cajas, cartones o POs. Cada reset pide el gafete de un supervisor y el motivo."
            : "Borra los escaneos y resetea estados de cajas, cartones o POs. Cada reset queda registrado con su motivo."
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-50 border border-zinc-200 rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Buscador o elemento elegido */}
      {!seleccion ? (
        <div className="space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              autoFocus
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setResult(null); }}
              placeholder={tabActual.placeholder}
              className="w-full h-11 rounded-lg bg-white border border-zinc-200 text-zinc-900 text-sm pl-9 pr-9 font-mono placeholder:font-sans placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
            />
            {isFetching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />}
          </div>
          <p className="text-xs text-zinc-500">
            {!q
              ? "Las 25 más recientes"
              : resultados.length === 25
                ? "Primeras 25 coincidencias"
                : `${resultados.length} ${resultados.length === 1 ? "coincidencia" : "coincidencias"}`}{" "}
            · elige una para resetearla
          </p>
          <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
            {resultados.length === 0 && !isFetching ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Sin coincidencias</p>
            ) : (
              resultados.map((r) => (
                <button
                  key={r.id}
                  onClick={() => elegir(r)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-zinc-900 break-all">{r.codigo}</span>
                    <span className={`text-xs shrink-0 ${ESTADO_COLORS[r.estado] || "text-zinc-600"}`}>{r.estado}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{detalle(tab, r)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">{tabActual.label} seleccionada</p>
            <p className="font-mono text-sm text-zinc-900 break-all">{seleccion.codigo}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              <span className={ESTADO_COLORS[seleccion.estado] || "text-zinc-600"}>{seleccion.estado}</span> · {detalle(tab, seleccion)}
            </p>
          </div>
          <button
            onClick={() => { setSeleccion(null); setAccion(null); }}
            className="shrink-0 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
          >
            <X size={13} /> Cambiar
          </button>
        </div>
      )}

      {/* Desasociar (solo cajas que están en cartones) */}
      {puedeDesasociar && !result && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Unlink size={16} className="text-sky-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-sky-700 font-medium">Desasociar de sus cartones</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {ADVERTENCIA.desasociar} Úsalo si la caja se va a abrir o corregir.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAccion("desasociar")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium hover:bg-sky-100 transition-colors"
          >
            <Unlink size={14} />
            Desasociar caja
          </button>
        </div>
      )}

      {/* Reset */}
      {puedeResetear && !result && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-700 font-medium">Esta acción no se puede deshacer</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{ADVERTENCIA[tab]}</p>
            </div>
          </div>
          <button
            onClick={() => setAccion("reset")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <Trash2 size={14} />
            Resetear
          </button>
        </div>
      )}

      {accion && seleccion && (
        <AutorizarReseteoModal
          titulo={accion === "desasociar" ? "Desasociar caja" : `Resetear ${tabActual.label.toLowerCase()}`}
          codigo={seleccion.codigo}
          advertencia={accion === "desasociar" ? ADVERTENCIA.desasociar : ADVERTENCIA[tab]}
          textoBoton={accion === "desasociar" ? "Desasociar" : "Resetear"}
          requiereGafete={requiereGafete}
          ejecutar={ejecutar}
          onClose={() => setAccion(null)}
          onHecho={hecho}
        />
      )}

      {/* Resultado */}
      {result && (
        <div className={`rounded-xl border p-5 space-y-3 ${
          result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
        }`}>
          <div className="flex items-center gap-2">
            {result.ok
              ? <CheckCircle2 size={16} className="text-emerald-700" />
              : <XCircle size={16} className="text-red-700" />
            }
            <p className={`text-sm font-medium ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
              {result.ok ? result.titulo : result.msg}
            </p>
          </div>
          {result.ok && (
            <div className="space-y-1">
              {Object.entries(result.data).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{k.replace(/_/g, " ")}</span>
                  <span className="text-zinc-700 font-mono">{v}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => { setResult(null); setTexto(""); }}
            className="text-xs text-zinc-500 hover:text-zinc-600 transition-colors"
          >
            Hacer otro reset
          </button>
        </div>
      )}
    </div>
  );
}
