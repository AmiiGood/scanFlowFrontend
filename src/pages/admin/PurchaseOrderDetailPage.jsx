import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPurchaseOrder,
  enviarPO,
  cancelarPO,
  historialEnvios,
} from "@/api/purchaseOrders";
import { useAuth } from "@/hooks/useAuth";
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
  pendiente: "bg-zinc-100 text-zinc-600 border-zinc-200",
  en_proceso: "bg-blue-50 text-blue-700 border-blue-200",
  completo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  enviado: "bg-violet-50 text-violet-700 border-violet-200",
  cancelado: "bg-red-50 text-red-700 border-red-200",
};

const CARTON_ESTADO_STYLES = {
  pendiente: "text-zinc-500",
  en_proceso: "text-blue-700",
  completo: "text-emerald-700",
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
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
    return <div className="p-8 text-zinc-500">Cargando...</div>;
  }

  if (!po) {
    return <div className="p-8 text-zinc-500">PO no encontrada</div>;
  }

  const totalCartones = po.cartones?.length || 0;
  const cartonesCompletos =
    po.cartones?.filter((c) => c.estado === "completo").length || 0;
  const progresoPct =
    totalCartones > 0 ? (cartonesCompletos / totalCartones) * 100 : 0;
  // Cartones que dice el Excel de la PO y que no entraron al importar (por
  // ejemplo, por SKUs que no estaban en el catálogo).
  const faltanImportar = Math.max(0, Number(po.cantidad_cartones || 0) - totalCartones);
  const puedeEnviar =
    faltanImportar === 0 &&
    (po.estado === "completo" ||
      (po.estado === "pendiente" &&
        cartonesCompletos === totalCartones &&
        totalCartones > 0));
  const puedeCancelar = po.estado === "enviado" && user?.rol === "superadmin";

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/admin/purchase-orders")}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
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
                  className="border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 gap-1.5"
                >
                  <XCircle size={14} />
                  Cancelar PO
                </Button>
              )}
              {puedeEnviar && (
                <Button
                  size="sm"
                  onClick={() => setConfirmModal("enviar")}
                  className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
                >
                  <Send size={14} />
                  Enviar a T4
                </Button>
              )}
            </div>
          }
        />
      </div>

      {faltanImportar > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Faltan <span className="font-semibold">{faltanImportar}</span> de {po.cantidad_cartones} cartones por
          importar. La PO no se puede enviar a T4 hasta que entren: revisa en Purchase Orders › Importar Excel qué
          SKUs faltan y vuelve a importar su archivo.
        </div>
      )}

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
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
          >
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <div className="text-zinc-900 font-medium text-sm">{value}</div>
          </div>
        ))}
      </div>

      {/* Barra de progreso general */}
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">Progreso general</span>
          <span className="text-xs text-zinc-600">
            {progresoPct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-white">
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
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <Clock size={14} />
          Historial de envíos
          {historialOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {historialOpen && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {historial.length === 0 ? (
              <p className="px-4 py-3 text-xs text-zinc-500">
                Sin envíos registrados
              </p>
            ) : (
              historial.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-4 px-4 py-3 border-b border-zinc-200 last:border-0 text-xs"
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
        <h2 className="text-sm font-medium text-zinc-600 mb-3">
          Cartones{" "}
          <span className="text-zinc-500 font-normal">({totalCartones})</span>
        </h2>
        <div className="space-y-1.5">
          {po.cartones?.map((carton) => (
            <div
              key={carton.id}
              className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedCarton(
                    expandedCarton === carton.id ? null : carton.id,
                  )
                }
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
              >
                <Package
                  size={14}
                  className={CARTON_ESTADO_STYLES[carton.estado]}
                />
                <span className="font-mono text-xs text-zinc-900 flex-1">
                  {carton.carton_id}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md border ${
                    carton.tipo === "musical"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
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
                  <ChevronUp size={12} className="text-zinc-400" />
                ) : (
                  <ChevronDown size={12} className="text-zinc-400" />
                )}
              </button>

              {expandedCarton === carton.id && (
                <div className="border-t border-zinc-200 px-4 py-3 bg-zinc-50">
                  <div className="space-y-1.5">
                    {carton.detalles?.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-zinc-600">
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
        <DialogContent className="bg-white border-zinc-200 text-zinc-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-900">
              {confirmModal === "enviar"
                ? "Enviar PO a T4"
                : "Cancelar PO en T4"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-zinc-600">
              {confirmModal === "enviar"
                ? `¿Confirmas el envío de la PO ${po.po_number} a la API T4? Esta acción enviará ${totalCartones} cartones.`
                : `¿Confirmas la cancelación de la PO ${po.po_number} en T4? Deberá re-enviarse si se necesita nuevamente.`}
            </p>

            {(enviarMut.error || cancelarMut.error) && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {enviarMut.error?.response?.data?.error ||
                  cancelarMut.error?.response?.data?.error ||
                  "Error al procesar"}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmModal(null)}
                className="flex-1 text-zinc-600 hover:text-zinc-900 border border-zinc-200"
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
                className={`flex-1 gap-1.5 ${confirmModal === "cancelar" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
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
