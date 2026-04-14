import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPurchaseOrders, importPurchaseOrders } from "@/api/purchaseOrders";
import PageHeader from "@/components/layout/PageHeader";
import Paginator from "@/components/ui/Paginator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  CheckCircle2,
  XCircle,
  ChevronRight,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

const ESTADO_STYLES = {
  pendiente: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  en_proceso: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completo: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  enviado: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  cancelado: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ESTADOS = ["pendiente", "en_proceso", "completo", "enviado", "cancelado"];

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", debouncedSearch, estado, page],
    queryFn: () =>
      getPurchaseOrders({
        search: debouncedSearch,
        estado,
        page,
        limit: 20,
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const pos = data?.data || [];

  const importMut = useMutation({
    mutationFn: importPurchaseOrders,
    onSuccess: (res) => {
      setResult(res.data);
      qc.invalidateQueries(["purchase-orders"]);
    },
    onError: (e) =>
      setResult([{ error: e.response?.data?.error || "Error al importar" }]),
  });

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResult(null);
    importMut.mutate(file);
    e.target.value = "";
  }

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
  }
  function handleEstado(val) {
    setEstado(val === estado ? "" : val);
    setPage(1);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Purchase Orders"
        description={
          data
            ? `${data.total.toLocaleString()} órdenes en total`
            : "Órdenes de compra"
        }
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              size="sm"
              onClick={() => fileRef.current.click()}
              disabled={importMut.isPending}
              className="bg-white text-zinc-950 hover:bg-zinc-100 gap-1.5"
            >
              <Upload size={14} />
              {importMut.isPending ? "Importando..." : "Importar Excel"}
            </Button>
          </>
        }
      />

      {/* Resultado importación */}
      {result && (
        <div className="mb-4 space-y-1.5">
          {result.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border px-4 py-2.5 text-sm flex items-center gap-3 ${r.error ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}
            >
              {r.error ? (
                <>
                  <XCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-red-400">
                    {r.po_number || "Error"}: {r.error}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400 shrink-0"
                  />
                  <span className="text-emerald-400 font-medium">
                    PO {r.po_number}
                  </span>
                  <span className="text-zinc-500">—</span>
                  <span className="text-zinc-400">
                    {r.cartones_insertados} cartones
                  </span>
                  {r.carton_errors?.length > 0 && (
                    <span className="text-red-400 text-xs">
                      {r.carton_errors.length} con error
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por número de PO..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => handleEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                estado === e
                  ? ESTADO_STYLES[e]
                  : "border-white/5 text-zinc-600 hover:text-zinc-400 hover:border-white/10"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                PO Number
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Pares
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Progreso cartones
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Fecha
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Estado
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-600">
                  Cargando...
                </td>
              </tr>
            ) : pos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-600">
                    <FileSpreadsheet size={24} />
                    <span className="text-sm">
                      {search || estado
                        ? "Sin resultados"
                        : "Sin POs — importa un archivo Excel"}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              pos.map((po) => (
                <tr
                  key={po.id}
                  onClick={() => navigate(`/admin/purchase-orders/${po.id}`)}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-white font-mono text-xs font-medium">
                    {po.po_number}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {Number(po.cantidad_pares).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 max-w-24">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${po.total_cartones > 0 ? (po.cartones_completos / po.total_cartones) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-zinc-400 text-xs">
                        {po.cartones_completos}/{po.total_cartones}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {po.cfm_xf_date
                      ? new Date(po.cfm_xf_date).toLocaleDateString("es-MX")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${ESTADO_STYLES[po.estado]}`}
                    >
                      {po.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={14} className="text-zinc-600 ml-auto" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginator
        page={data?.page || 1}
        pages={data?.pages || 1}
        total={data?.total || 0}
        limit={20}
        onPage={setPage}
      />
    </div>
  );
}
