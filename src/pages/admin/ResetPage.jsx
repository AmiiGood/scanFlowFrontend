import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPurchaseOrders } from "@/api/purchaseOrders";
import { getCartonesPorPO } from "@/api/embarque";
import { getCajas } from "@/api/cajas";
import { resetCaja, resetCarton, resetPO } from "@/api/reset";
import PageHeader from "@/components/layout/PageHeader";
import { Trash2, AlertTriangle, ChevronDown, Box, Package, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const TAB_LABELS = [
  { key: "caja",   label: "Caja",   icon: Box },
  { key: "carton", label: "Cartón", icon: Package },
  { key: "po",     label: "PO",     icon: FileText },
];

const ESTADO_COLORS = {
  abierta:   "text-blue-400",
  empacada:  "text-emerald-400",
  pendiente: "text-zinc-400",
  en_proceso:"text-amber-400",
  completo:  "text-emerald-400",
  enviado:   "text-violet-400",
  cancelado: "text-red-400",
};

export default function ResetPage() {
  const qc = useQueryClient();
  const [tab, setTab]         = useState("caja");
  const [poId, setPoId]       = useState("");
  const [cartonId, setCartonId] = useState("");
  const [cajaId, setCajaId]   = useState("");
  const [confirm, setConfirm] = useState(false);
  const [result, setResult]   = useState(null);

  // POs
  const { data: pos = [] } = useQuery({
    queryKey: ["pos-reset"],
    queryFn: () => getPurchaseOrders().then((r) => r.data.data),
  });

  // Cartones de la PO seleccionada
  const { data: cartones = [] } = useQuery({
    queryKey: ["cartones-reset", poId],
    queryFn: () => getCartonesPorPO(poId).then((r) => r.data),
    enabled: !!poId && (tab === "carton"),
  });

  // Cajas — todas o filtradas
  const { data: cajasData = [] } = useQuery({
    queryKey: ["cajas-reset"],
    queryFn: () => getCajas().then((r) => r.data),
    enabled: tab === "caja",
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (tab === "caja")   return resetCaja(cajaId);
      if (tab === "carton") return resetCarton(cartonId);
      if (tab === "po")     return resetPO(poId);
    },
    onSuccess: (res) => {
      setResult({ ok: true, data: res.data });
      setConfirm(false);
      setCajaId(""); setCartonId("");
      qc.invalidateQueries();
    },
    onError: (e) => {
      setResult({ ok: false, msg: e.response?.data?.error || "Error al resetear" });
      setConfirm(false);
    },
  });

  function canSubmit() {
    if (tab === "caja")   return !!cajaId;
    if (tab === "carton") return !!poId && !!cartonId;
    if (tab === "po")     return !!poId;
    return false;
  }

  function getLabel() {
    if (tab === "caja") {
      const c = cajasData.find((c) => String(c.id) === cajaId);
      return c ? `${c.codigo_caja} (${c.sku_number})` : "";
    }
    if (tab === "carton") {
      const c = cartones.find((c) => String(c.id) === cartonId);
      return c ? `${c.carton_id} (${c.tipo})` : "";
    }
    if (tab === "po") {
      const p = pos.find((p) => String(p.id) === poId);
      return p ? p.po_number : "";
    }
  }

  function handleTabChange(key) {
    setTab(key);
    setPoId(""); setCartonId(""); setCajaId("");
    setConfirm(false); setResult(null);
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <PageHeader
        title="Reset de asociaciones"
        description="Borra los escaneos y resetea estados de cajas, cartones o POs"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1">
        {TAB_LABELS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Selects */}
      <div className="space-y-4">
        {/* Selector PO — para carton y po */}
        {(tab === "carton" || tab === "po") && (
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Purchase Order
            </label>
            <div className="relative">
              <select
                value={poId}
                onChange={(e) => { setPoId(e.target.value); setCartonId(""); setResult(null); }}
                className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="" className="bg-zinc-900">Selecciona una PO...</option>
                {pos.map((p) => (
                  <option key={p.id} value={p.id} className="bg-zinc-900">
                    {p.po_number} — {p.estado}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Selector Cartón */}
        {tab === "carton" && (
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Cartón
            </label>
            <div className="relative">
              <select
                value={cartonId}
                onChange={(e) => { setCartonId(e.target.value); setResult(null); }}
                disabled={!poId}
                className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-40"
              >
                <option value="" className="bg-zinc-900">Selecciona un cartón...</option>
                {cartones.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">
                    {c.carton_id} — {c.tipo} — {c.estado}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Selector Caja */}
        {tab === "caja" && (
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              Caja
            </label>
            <div className="relative">
              <select
                value={cajaId}
                onChange={(e) => { setCajaId(e.target.value); setResult(null); }}
                className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="" className="bg-zinc-900">Selecciona una caja...</option>
                {cajasData.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900">
                    {c.sku_number} — {c.codigo_caja} — {c.estado}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Advertencia + confirmación */}
      {canSubmit() && !result && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Esta acción no se puede deshacer</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {tab === "caja" && "Se borrarán todos los escaneos de la caja y los QRs volverán a estado disponible."}
                {tab === "carton" && "Se borrarán los escaneos musicales del cartón, se desligarán las cajas y volverán a estado empacada."}
                {tab === "po" && "Se resetearán todos los cartones y cajas de la PO. Los QRs volverán a estado disponible."}
              </p>
              <p className="text-xs text-white/60 mt-2 font-mono">{getLabel()}</p>
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
          result.ok
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-red-500/20 bg-red-500/5"
        }`}>
          <div className="flex items-center gap-2">
            {result.ok
              ? <CheckCircle2 size={16} className="text-emerald-400" />
              : <XCircle size={16} className="text-red-400" />
            }
            <p className={`text-sm font-medium ${result.ok ? "text-emerald-400" : "text-red-400"}`}>
              {result.ok ? "Reset completado" : result.msg}
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
            onClick={() => setResult(null)}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Hacer otro reset
          </button>
        </div>
      )}
    </div>
  );
}
