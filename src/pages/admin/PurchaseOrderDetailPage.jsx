import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPurchaseOrder,
  enviarPO,
  cancelarPO,
  historialEnvios,
} from "@/api/purchaseOrders";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Send,
  XCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
} from "lucide-react";

const ESTADO_STYLES = {
  pendiente: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  en_proceso: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completo: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  enviado: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  cancelado: "bg-red-500/10 text-red-400 border-red-500/20",
};

const CARTON_ESTADO_STYLES = {
  pendiente: "text-zinc-600",
  en_proceso: "text-blue-400",
  completo: "text-emerald-400",
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmModal, setConfirmModal] = useState(null); // 'enviar' | 'cancelar'
  const [historialOpen, setHistorialOpen] = useState(false);
  const [expandedCarton, setExpandedCarton] = useState(null);

  const { data: po, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => getPurchaseOrder(id).then((r) => r.data),
  });

  const { data: historial = [] } = useQuery({
    queryKey: ["historial-envios", id],
    queryFn: () => historialEnvios(id).then((r) => r.data),
    enabled: historialOpen,
  });

  const enviarMut = useMutation({
    mutationFn: () => enviarPO(id),
    onSuccess: () => {
      qc.invalidateQueries(["purchase-order", id]);
      qc.invalidateQueries(["purchase-orders"]);
      setConfirmModal(null);
    },
  });

  const cancelarMut = useMutation({
    mutationFn: () => cancelarPO(id),
    onSuccess: () => {
      qc.invalidateQueries(["purchase-order", id]);
      qc.invalidateQueries(["purchase-orders"]);
      setConfirmModal(null);
    },
  });

  if (isLoading) {
    return <div className="p-8 text-zinc-600">Cargando...</div>;
  }

  if (!po) {
    return <div className="p-8 text-zinc-600">PO no encontrada</div>;
  }

  const totalCartones = po.cartones?.length || 0;
  const cartonesCompletos =
    po.cartones?.filter((c) => c.estado === "completo").length || 0;
  const progresoPct =
    totalCartones > 0 ? (cartonesCompletos / totalCartones) * 100 : 0;
  const puedeEnviar =
    po.estado === "completo" ||
    (po.estado === "pendiente" &&
      cartonesCompletos === totalCartones &&
      totalCartones > 0);
  const puedeCancelar = po.estado === "enviado";

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/admin/purchase-orders")}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <PageHeader
          title={`PO ${po.po_number}`}
          description={`${Number(po.cantidad_pares).toLocaleString()} pares · ${totalCartones} cartones`}
          actions={
            <div className="flex items-center gap-2">
              {puedeCancelar && (
                <Button
                  size="sm"
                  onClick={() => setConfirmModal("cancelar")}
                  className="border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 gap-1.5"
                >
                  <XCircle size={14} />
                  Cancelar PO
                </Button>
              )}
              {puedeEnviar && (
                <Button
                  size="sm"
                  onClick={() => setConfirmModal("enviar")}
                  className="bg-white text-zinc-950 hover:bg-zinc-100 gap-1.5"
                >
                  <Send size={14} />
                  Enviar a T4
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Estado",
            value: (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${ESTADO_STYLES[po.estado]}`}
              >
                {po.estado}
              </span>
            ),
          },
          {
            label: "Pares totales",
            value: Number(po.cantidad_pares).toLocaleString(),
          },
          {
            label: "Cartones completos",
            value: `${cartonesCompletos} / ${totalCartones}`,
          },
          {
            label: "Fecha confirmación",
            value: po.cfm_xf_date
              ? new Date(po.cfm_xf_date).toLocaleDateString("es-MX")
              : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
          >
            <p className="text-xs text-zinc-600 mb-1">{label}</p>
            <div className="text-white font-medium text-sm">{value}</div>
          </div>
        ))}
      </div>

      {/* Barra de progreso general */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">Progreso general</span>
          <span className="text-xs text-zinc-400">
            {progresoPct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progresoPct}%` }}
          />
        </div>
      </div>

      {/* Historial de envíos */}
      <div className="mb-6">
        <button
          onClick={() => setHistorialOpen(!historialOpen)}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Clock size={14} />
          Historial de envíos
          {historialOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {historialOpen && (
          <div className="mt-3 rounded-xl border border-white/5 overflow-hidden">
            {historial.length === 0 ? (
              <p className="px-4 py-3 text-xs text-zinc-600">
                Sin envíos registrados
              </p>
            ) : (
              historial.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 text-xs"
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium border ${ESTADO_STYLES[h.estado]}`}
                  >
                    {h.estado}
                  </span>
                  <span className="text-zinc-500">
                    {new Date(h.created_at).toLocaleString("es-MX")}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Lista de cartones */}
      <div>
        <h2 className="text-sm font-medium text-zinc-400 mb-3">
          Cartones{" "}
          <span className="text-zinc-600 font-normal">({totalCartones})</span>
        </h2>
        <div className="space-y-1.5">
          {po.cartones?.map((carton) => (
            <div
              key={carton.id}
              className="rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedCarton(
                    expandedCarton === carton.id ? null : carton.id,
                  )
                }
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
              >
                <Package
                  size={14}
                  className={CARTON_ESTADO_STYLES[carton.estado]}
                />
                <span className="font-mono text-xs text-white flex-1">
                  {carton.carton_id}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md border ${
                    carton.tipo === "musical"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                  }`}
                >
                  {carton.tipo === "musical" ? "Musical" : "Mono SKU"}
                </span>
                <span
                  className={`text-xs font-medium ${CARTON_ESTADO_STYLES[carton.estado]}`}
                >
                  {carton.estado}
                </span>
                {expandedCarton === carton.id ? (
                  <ChevronUp size={12} className="text-zinc-600" />
                ) : (
                  <ChevronDown size={12} className="text-zinc-600" />
                )}
              </button>

              {expandedCarton === carton.id && (
                <div className="border-t border-white/5 px-4 py-3 bg-white/[0.01]">
                  <div className="space-y-1.5">
                    {carton.detalles?.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-zinc-400">
                          {d.sku_number}
                        </span>
                        <span className="text-zinc-500">
                          {d.cantidad} pares
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal confirmación */}
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {confirmModal === "enviar"
                ? "Enviar PO a T4"
                : "Cancelar PO en T4"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-zinc-400">
              {confirmModal === "enviar"
                ? `¿Confirmas el envío de la PO ${po.po_number} a la API T4? Esta acción enviará ${totalCartones} cartones.`
                : `¿Confirmas la cancelación de la PO ${po.po_number} en T4? Deberá re-enviarse si se necesita nuevamente.`}
            </p>

            {(enviarMut.error || cancelarMut.error) && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {enviarMut.error?.response?.data?.error ||
                  cancelarMut.error?.response?.data?.error ||
                  "Error al procesar"}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmModal(null)}
                className="flex-1 text-zinc-400 hover:text-white border border-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  confirmModal === "enviar"
                    ? enviarMut.mutate()
                    : cancelarMut.mutate()
                }
                disabled={enviarMut.isPending || cancelarMut.isPending}
                className={`flex-1 gap-1.5 ${confirmModal === "cancelar" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-white text-zinc-950 hover:bg-zinc-100"}`}
              >
                {confirmModal === "enviar" ? (
                  <>
                    <Send size={14} />
                    {enviarMut.isPending ? "Enviando..." : "Confirmar envío"}
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    {cancelarMut.isPending
                      ? "Cancelando..."
                      : "Confirmar cancelación"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
