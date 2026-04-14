import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProduccionPorDia,
  getTrazabilidadQR,
  getCajasPorSKU,
  getQrsSinSKU,
  getHistorialEnviosT4,
  getProduccionPorOperador,
} from "@/api/reports";
import { getPurchaseOrders } from "@/api/purchaseOrders";
import { getCartonesPendientesPorPO } from "@/api/reports";
import PageHeader from "@/components/layout/PageHeader";
import Paginator from "@/components/ui/Paginator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportMultiSheet } from "@/lib/exportExcel";
import { useDebounce } from "@/hooks/useDebounce";
import {
  BarChart2,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Package,
  QrCode,
  Send,
  Activity,
} from "lucide-react";

const TABS = [
  { id: "produccion", label: "Producción por día", icon: Activity },
  { id: "trazabilidad", label: "Trazabilidad QR", icon: QrCode },
  { id: "cajas", label: "Cajas por SKU", icon: Package },
  { id: "pendientes", label: "Cartones pendientes", icon: BarChart2 },
  { id: "sin-sku", label: "QRs sin SKU", icon: QrCode },
  { id: "envios", label: "Historial T4", icon: Send },
];

// --- Tab: Producción por día ---
function TabProduccion() {
  const [dias, setDias] = useState(30);
  const { data = [], isLoading } = useQuery({
    queryKey: ["reporte-produccion-dia", dias],
    queryFn: () => getProduccionPorDia(dias).then((r) => r.data),
  });

  function handleExport() {
    exportToExcel(
      data.map((r) => ({
        Fecha: r.fecha,
        "QRs Escaneados": r.qrs_escaneados,
        "Cajas Trabajadas": r.cajas_trabajadas,
        "Operadores Activos": r.operadores_activos,
      })),
      `produccion-por-dia-${dias}d`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={dias}
          onChange={(e) => setDias(parseInt(e.target.value))}
          className="h-9 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          {[7, 15, 30, 60, 90].map((d) => (
            <option key={d} value={d} className="bg-zinc-900">
              {d} días
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={!data.length}
          className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 ml-auto"
        >
          <Download size={14} /> Exportar Excel
        </Button>
      </div>
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Fecha
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                QRs escaneados
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Cajas trabajadas
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Operadores activos
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">
                  Sin datos
                </td>
              </tr>
            ) : (
              data.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white font-mono text-xs">
                    {new Date(r.fecha).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-semibold tabular-nums">
                    {Number(r.qrs_escaneados).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-400 tabular-nums">
                    {r.cajas_trabajadas}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">
                    {r.operadores_activos}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Tab: Trazabilidad QR ---
function TabTrazabilidad() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["trazabilidad-qr", query],
    queryFn: () => getTrazabilidadQR(query).then((r) => r.data),
    enabled: !!query,
  });

  function handleSearch(e) {
    e.preventDefault();
    setQuery(search.trim());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-lg">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pega o escanea el código QR completo..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 h-9 font-mono text-xs"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="bg-white text-zinc-950 hover:bg-zinc-100"
        >
          Buscar
        </Button>
      </form>

      {isLoading && <p className="text-zinc-600 text-sm">Buscando...</p>}
      {error && (
        <p className="text-red-400 text-sm">
          {error.response?.data?.error || "QR no encontrado"}
        </p>
      )}

      {data && (
        <div className="space-y-3">
          {/* Info QR */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Información del QR
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Código QR", value: data.codigo_qr, mono: true },
                { label: "UPC", value: data.upc, mono: true },
                { label: "SKU", value: data.sku_number || "—" },
                { label: "Producto", value: data.style_name || "—" },
                { label: "Talla", value: data.size || "—" },
                { label: "Color", value: data.color_name || "—" },
                {
                  label: "Estado",
                  value: data.estado,
                  color:
                    data.estado === "enviado"
                      ? "text-violet-400"
                      : data.estado === "escaneado"
                        ? "text-blue-400"
                        : "text-emerald-400",
                },
              ].map(({ label, value, mono, color }) => (
                <div key={label}>
                  <p className="text-zinc-600 text-xs">{label}</p>
                  <p
                    className={`text-white font-medium ${mono ? "font-mono text-xs" : ""} ${color || ""}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cadena de custodia */}
          {data.codigo_caja && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                Cadena de custodia
              </p>
              <div className="space-y-3">
                {[
                  {
                    label: "Escaneado por",
                    value: data.escaneado_por,
                    ts: data.escaneado_at,
                  },
                  {
                    label: "Caja",
                    value: data.codigo_caja,
                    sub: data.caja_estado,
                  },
                  {
                    label: "Cartón",
                    value: data.carton_id,
                    sub: `${data.carton_tipo} · ${data.carton_estado}`,
                  },
                  {
                    label: "Purchase Order",
                    value: data.po_number,
                    sub: data.po_estado,
                  },
                ].map(
                  ({ label, value, sub, ts }) =>
                    value && (
                      <div
                        key={label}
                        className="flex items-start justify-between text-sm"
                      >
                        <div>
                          <p className="text-zinc-600 text-xs">{label}</p>
                          <p className="text-white font-mono text-xs font-medium">
                            {value}
                          </p>
                          {sub && (
                            <p className="text-zinc-500 text-xs">{sub}</p>
                          )}
                        </div>
                        {ts && (
                          <span className="text-zinc-600 text-xs">
                            {new Date(ts).toLocaleString("es-MX")}
                          </span>
                        )}
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Tab: Cajas por SKU ---
function TabCajas() {
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["cajas-sku", debouncedSearch, estado, page],
    queryFn: () =>
      getCajasPorSKU({ sku: debouncedSearch, estado, page, limit: 50 }).then(
        (r) => r.data,
      ),
    keepPreviousData: true,
  });

  function handleExport() {
    exportToExcel(
      (data?.data || []).map((r) => ({
        "Código Caja": r.codigo_caja,
        SKU: r.sku_number,
        Producto: r.style_name,
        Talla: r.size,
        "Cantidad Pares": r.cantidad_pares,
        "QRs Escaneados": r.qrs_escaneados,
        Estado: r.estado,
        "Creado Por": r.creado_por,
        Fecha: new Date(r.created_at).toLocaleString("es-MX"),
      })),
      "cajas-por-sku",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por SKU..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-9"
          />
        </div>
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none"
        >
          <option value="" className="bg-zinc-900">
            Todos
          </option>
          <option value="abierta" className="bg-zinc-900">
            Abiertas
          </option>
          <option value="empacada" className="bg-zinc-900">
            Empacadas
          </option>
        </select>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={!data?.data?.length}
          className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 ml-auto"
        >
          <Download size={14} /> Exportar
        </Button>
      </div>
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Código Caja
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                SKU
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Talla
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Pares
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Escaneados
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Operador
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-600">
                  Cargando...
                </td>
              </tr>
            ) : (
              (data?.data || []).map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white font-mono text-xs">
                    {r.codigo_caja}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 font-mono text-xs">
                    {r.sku_number}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{r.size}</td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                    {r.cantidad_pares}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
                    {r.qrs_escaneados}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium ${r.estado === "empacada" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {r.creado_por}
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
        limit={50}
        onPage={setPage}
      />
    </div>
  );
}

// --- Tab: Cartones pendientes por PO ---
function TabPendientes() {
  const [search, setSearch] = useState("");
  const [poSeleccionada, setPoSeleccionada] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: posData } = useQuery({
    queryKey: ["purchase-orders-pendientes", debouncedSearch],
    queryFn: () =>
      getPurchaseOrders({
        search: debouncedSearch,
        estado: "",
        limit: 20,
      }).then((r) => r.data),
  });

  const { data: pendientes, isLoading } = useQuery({
    queryKey: ["cartones-pendientes", poSeleccionada?.id],
    queryFn: () =>
      getCartonesPendientesPorPO(poSeleccionada.id).then((r) => r.data),
    enabled: !!poSeleccionada,
  });

  function handleExport() {
    if (!pendientes) return;
    exportToExcel(
      pendientes.cartones_pendientes.map((c) => ({
        "Cartón ID": c.carton_id,
        Tipo: c.tipo,
        Estado: c.estado,
      })),
      `cartones-pendientes-${poSeleccionada.po_number}`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar PO..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-9"
          />
        </div>
        {poSeleccionada && (
          <Button
            size="sm"
            onClick={handleExport}
            className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 ml-auto"
          >
            <Download size={14} /> Exportar
          </Button>
        )}
      </div>

      {!poSeleccionada ? (
        <div className="space-y-1.5">
          {(posData?.data || []).map((po) => (
            <button
              key={po.id}
              onClick={() => setPoSeleccionada(po)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-colors text-left"
            >
              <span className="font-mono text-xs text-white font-medium flex-1">
                {po.po_number}
              </span>
              <span className="text-zinc-500 text-xs">
                {po.cartones_completos}/{po.total_cartones} completos
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPoSeleccionada(null)}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              ← Cambiar PO
            </button>
            <span className="text-zinc-700">·</span>
            <span className="text-white font-mono text-xs font-medium">
              {poSeleccionada.po_number}
            </span>
            <span className="text-zinc-600 text-xs ml-1">
              {pendientes?.cartones_pendientes?.length || 0} cartones pendientes
            </span>
          </div>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                    Cartón ID
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                    SKUs
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-zinc-600"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : (
                  (pendientes?.cartones_pendientes || []).map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        {c.carton_id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md border font-medium ${c.tipo === "musical" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}
                        >
                          {c.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {c.estado}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {c.detalles
                          ?.map(
                            (d) =>
                              `${d.sku_number} (${d.cantidad_actual}/${d.cantidad_esperada})`,
                          )
                          .join(" · ")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Tab: QRs sin SKU ---
function TabQRsSinSKU() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["qrs-sin-sku", page],
    queryFn: () => getQrsSinSKU({ page, limit: 100 }).then((r) => r.data),
    keepPreviousData: true,
  });

  function handleExport() {
    exportToExcel(
      (data?.data || []).map((r) => ({
        "Código QR": r.codigo_qr,
        UPC: r.upc,
        Estado: r.estado,
        "Fecha Importación": new Date(r.created_at).toLocaleString("es-MX"),
      })),
      "qrs-sin-sku",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {data?.total ? (
            <>
              <span className="text-red-400 font-semibold">
                {data.total.toLocaleString()}
              </span>{" "}
              QRs sin SKU asignado
            </>
          ) : (
            "Cargando..."
          )}
        </p>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={!data?.data?.length}
          className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100"
        >
          <Download size={14} /> Exportar
        </Button>
      </div>
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Código QR
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                UPC
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Importado
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">
                  Cargando...
                </td>
              </tr>
            ) : (data?.data || []).length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-emerald-400 text-xs"
                >
                  ✓ Todos los QRs tienen SKU asignado
                </td>
              </tr>
            ) : (
              (data?.data || []).map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white font-mono text-xs truncate max-w-xs">
                    {r.codigo_qr}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {r.upc}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {r.estado}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs">
                    {new Date(r.created_at).toLocaleDateString("es-MX")}
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
        limit={100}
        onPage={setPage}
      />
    </div>
  );
}

// --- Tab: Historial T4 ---
function TabEnviosT4() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["historial-t4"],
    queryFn: () => getHistorialEnviosT4().then((r) => r.data),
  });

  function handleExport() {
    exportToExcel(
      data.map((r) => ({
        "PO Number": r.po_number,
        "Cantidad Pares": r.cantidad_pares,
        Estado: r.estado,
        "Enviado At": r.enviado_at
          ? new Date(r.enviado_at).toLocaleString("es-MX")
          : "—",
        "Cancelado At": r.cancelado_at
          ? new Date(r.cancelado_at).toLocaleString("es-MX")
          : "—",
        "Fecha Registro": new Date(r.created_at).toLocaleString("es-MX"),
      })),
      "historial-envios-t4",
    );
  }

  const ESTADO_STYLES = {
    enviado: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cancelado: "bg-red-500/10 text-red-400 border-red-500/20",
    pendiente: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleExport}
          disabled={!data.length}
          className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100"
        >
          <Download size={14} /> Exportar
        </Button>
      </div>
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                PO Number
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Enviado
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Cancelado
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Pares
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  Sin envíos registrados
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white font-mono text-xs font-medium">
                    {r.po_number}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium ${ESTADO_STYLES[r.estado]}`}
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {r.enviado_at
                      ? new Date(r.enviado_at).toLocaleString("es-MX")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {r.cancelado_at
                      ? new Date(r.cancelado_at).toLocaleString("es-MX")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                    {Number(r.cantidad_pares).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Página principal ---
export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState("produccion");

  const TAB_CONTENT = {
    produccion: <TabProduccion />,
    trazabilidad: <TabTrazabilidad />,
    cajas: <TabCajas />,
    pendientes: <TabPendientes />,
    "sin-sku": <TabQRsSinSKU />,
    envios: <TabEnviosT4 />,
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Reportes"
        description="Análisis y trazabilidad del sistema"
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/5 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === id
                ? "border-white text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {TAB_CONTENT[activeTab]}
    </div>
  );
}
