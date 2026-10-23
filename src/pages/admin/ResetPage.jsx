import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buscarParaReset, desasociarCaja, resetCaja, resetCarton, resetPO } from "@/api/reset";
import { useDebounce } from "@/hooks/useDebounce";
import PageHeader from "@/components/layout/PageHeader";
import { Trash2, AlertTriangle, Box, Package, FileText, CheckCircle2, XCircle, Loader2, Search, X, Unlink } from "lucide-react";

const TABS = [
  { key: "caja",   label: "Caja",   icon: Box,      placeholder: "Escanea o escribe el código de la caja, o un SKU" },
  { key: "carton", label: "Cartón", icon: Package,  placeholder: "Escanea o escribe el cartón, o un número de PO" },
  { key: "po",     label: "PO",     icon: FileText, placeholder: "Escribe el número de PO" },
];

const ADVERTENCIA = {
  caja: "Se borrarán todos los escaneos de la caja y sus QRs volverán a estado disponible. Sus pares salen de los cartones donde estén y esos cartones vuelven a pendiente.",
  carton: "Se borrarán los escaneos de Embarque del cartón, se desligarán sus cajas (vuelven a empacada) y el cartón vuelve a pendiente.",
  po: "Se resetearán todos los cartones y cajas de la PO. Los QRs volverán a estado disponible y la PO a pendiente.",
};

const ESTADO_COLORS = {
  abierta:   "text-blue-400",
  empacada:  "text-emerald-400",
  pendiente: "text-zinc-400",
  en_proceso:"text-amber-400",
  completo:  "text-emerald-400",
  enviado:   "text-violet-400",
  cancelado: "text-red-400",
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
  const [tab, setTab]           = useState("caja");
  const [texto, setTexto]       = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [confirm, setConfirm]   = useState(false);
  const [result, setResult]     = useState(null);
  const [confirmDesasociar, setConfirmDesasociar] = useState(false);
  const q = useDebounce(texto, 250);

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ["reset-buscar", tab, q],
    queryFn: () => buscarParaReset(tab, q).then((r) => r.data),
    enabled: !seleccion,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (tab === "caja")   return resetCaja(seleccion.id);
      if (tab === "carton") return resetCarton(seleccion.id);
      return resetPO(seleccion.id);
    },
    onSuccess: (res) => {
      setResult({ ok: true, data: res.data });
      setConfirm(false);
      setSeleccion(null);
      qc.invalidateQueries();
    },
    onError: (e) => {
      setResult({ ok: false, msg: e.response?.data?.error || "Error al resetear" });
      setConfirm(false);
    },
  });

  // Desasociar: la caja sale de sus cartones pero conserva su escaneo de
  // Producción, para volver a asignarla (por ejemplo, si se abre o corrige).
  const desasociarMut = useMutation({
    mutationFn: () => desasociarCaja(seleccion.id),
    onSuccess: (res) => {
      setResult({ ok: true, titulo: "Caja desasociada", data: res.data });
      setConfirmDesasociar(false);
      setSeleccion(null);
      qc.invalidateQueries();
    },
    onError: (e) => {
      setResult({ ok: false, msg: e.response?.data?.error || "Error al desasociar" });
      setConfirmDesasociar(false);
    },
  });
  const puedeDesasociar =
    tab === "caja" && seleccion && (seleccion.carton_id || seleccion.pares_en_cartones > 0);

  function handleTabChange(key) {
    setTab(key);
    setTexto("");
    setSeleccion(null);
    setConfirm(false);
    setResult(null);
  }

  function elegir(r) {
    setSeleccion(r);
    setConfirm(false);
    setConfirmDesasociar(false);
    setResult(null);
  }

  const tabActual = TABS.find((t) => t.key === tab);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <PageHeader
        title="Reset de asociaciones"
        description="Borra los escaneos y resetea estados de cajas, cartones o POs"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
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
              className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm pl-9 pr-9 font-mono placeholder:font-sans placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            {isFetching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />}
          </div>
          <p className="text-xs text-zinc-600">
            {!q
              ? "Las 25 más recientes"
              : resultados.length === 25
                ? "Primeras 25 coincidencias"
                : `${resultados.length} ${resultados.length === 1 ? "coincidencia" : "coincidencias"}`}{" "}
            · elige una para resetearla
          </p>
          <div className="rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {resultados.length === 0 && !isFetching ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-600">Sin coincidencias</p>
            ) : (
              resultados.map((r) => (
                <button
                  key={r.id}
                  onClick={() => elegir(r)}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm text-white break-all">{r.codigo}</span>
                    <span className={`text-xs shrink-0 ${ESTADO_COLORS[r.estado] || "text-zinc-400"}`}>{r.estado}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{detalle(tab, r)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">{tabActual.label} seleccionada</p>
            <p className="font-mono text-sm text-white break-all">{seleccion.codigo}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              <span className={ESTADO_COLORS[seleccion.estado] || "text-zinc-400"}>{seleccion.estado}</span> · {detalle(tab, seleccion)}
            </p>
          </div>
          <button
            onClick={() => { setSeleccion(null); setConfirm(false); }}
            className="shrink-0 flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
          >
            <X size={13} /> Cambiar
          </button>
        </div>
      )}

      {/* Desasociar (solo cajas que están en cartones) */}
      {puedeDesasociar && !result && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Unlink size={16} className="text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-sky-400 font-medium">Desasociar de sus cartones</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Los pares de la caja salen de los cartones donde están (también los repartidos par por par o
                en musicales por PO) y esos cartones vuelven a pendiente. La caja sigue empacada con sus QRs
                escaneados, lista para volver a asignarse. Úsalo si la caja se va a abrir o corregir.
              </p>
            </div>
          </div>
          {!confirmDesasociar ? (
            <button
              onClick={() => setConfirmDesasociar(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium hover:bg-sky-500/20 transition-colors"
            >
              <Unlink size={14} />
              Desasociar caja
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDesasociar(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-sm hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => desasociarMut.mutate()}
                disabled={desasociarMut.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 text-sm font-medium hover:bg-sky-500/30 transition-colors disabled:opacity-50"
              >
                {desasociarMut.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Desasociando...</>
                  : <><Unlink size={14} /> Sí, desasociar</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Advertencia + confirmación */}
      {seleccion && !result && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Esta acción no se puede deshacer</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{ADVERTENCIA[tab]}</p>
            </div>
          </div>

          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
            >
              <Trash2 size={14} />
              Confirmar reset
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-sm hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {mutation.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Reseteando...</>
                  : <><Trash2 size={14} /> Sí, resetear</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className={`rounded-xl border p-5 space-y-3 ${
          result.ok ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
        }`}>
          <div className="flex items-center gap-2">
            {result.ok
              ? <CheckCircle2 size={16} className="text-emerald-400" />
              : <XCircle size={16} className="text-red-400" />
            }
            <p className={`text-sm font-medium ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
              {result.ok ? result.titulo || "Reset completado" : result.msg}
            </p>
          </div>
          {result.ok && (
            <div className="space-y-1">
              {Object.entries(result.data).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{k.replace(/_/g, " ")}</span>
                  <span className="text-zinc-300 font-mono">{v}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => { setResult(null); setTexto(""); }}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Hacer otro reset
          </button>
        </div>
      )}
    </div>
  );
}
