import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPurchaseOrders, importPurchaseOrders } from "@/api/purchaseOrders";
import PageHeader from "@/components/layout/PageHeader";
import Paginator from "@/components/ui/Paginator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  XCircle,
  ChevronRight,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { BotonPlantilla, RevisionPOs } from "@/components/admin/RevisionImportacion";

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

  // Primero se revisa el archivo (nada se escribe); luego se confirma la carga.
  const [archivo, setArchivo] = useState(null);
  const [analisis, setAnalisis] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState(null);
  const falla = (e) => setError(e.response?.data?.error || "Error al leer el archivo");

  const validarMut = useMutation({
    mutationFn: (file) => importPurchaseOrders(file, "validar"),
    onSuccess: (res) => setAnalisis(res.data),
    onError: falla,
  });
  const cargarMut = useMutation({
    mutationFn: () => importPurchaseOrders(archivo, "cargar"),
    onSuccess: (res) => {
      setAnalisis(res.data);
      setCargado(true);
      qc.invalidateQueries(["purchase-orders"]);
    },
    onError: falla,
  });

  function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setArchivo(file);
    setAnalisis(null);
    setCargado(false);
    setError(null);
    validarMut.mutate(file);
  }

  function cerrarRevision() {
    setAnalisis(null);
    setArchivo(null);
    setCargado(false);
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
            <BotonPlantilla href="/plantillas/plantilla_importar_POs.xlsx">Plantilla</BotonPlantilla>
            <Button
              size="sm"
              onClick={() => fileRef.current.click()}
              disabled={validarMut.isPending || cargarMut.isPending}
              className="bg-white text-zinc-950 hover:bg-zinc-100 gap-1.5"
            >
              <Upload size={14} />
              {validarMut.isPending ? "Revisando archivo..." : "Importar Excel"}
            </Button>
          </>
        }
      />

      {/* Revisión / resultado de la importación */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <XCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {analisis && (
        <RevisionPOs
          analisis={analisis}
          archivo={archivo?.name}
          cargado={cargado}
          cargando={cargarMut.isPending}
          onCargar={() => cargarMut.mutate()}
          onCerrar={cerrarRevision}
        />
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
                    {Number(po.total_cartones) < Number(po.cantidad_cartones) && (
                      <p className="text-amber-400 text-[11px] mt-1">
                        Faltan {Number(po.cantidad_cartones) - Number(po.total_cartones)} cartones por importar
                      </p>
                    )}
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
