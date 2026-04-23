import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getProduccionPorDia,
  getTrazabilidadQR,
  getCajasPorSKU,
  getQrsSinSKU,
  getHistorialEnviosT4,
  getCartonesPendientesPorPO,
  getDetalleCartonesPorPO,
} from "@/api/reports";
import { getPurchaseOrders } from "@/api/purchaseOrders";
import PageHeader from "@/components/layout/PageHeader";
import Paginator from "@/components/ui/Paginator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/exportExcel";
import { useDebounce } from "@/hooks/useDebounce";
import {
  BarChart2,
  Search,
  Download,
  Package,
  QrCode,
  Send,
  Activity,
  Layers,
} from "lucide-react";

const TABS = [
  { id: "produccion", label: "Producción por día", icon: Activity },
  { id: "trazabilidad", label: "Trazabilidad QR", icon: QrCode },
  { id: "cajas", label: "Cajas por SKU", icon: Package },
  { id: "pendientes", label: "Cartones pendientes", icon: BarChart2 },
  { id: "detalle-po", label: "Detalle PO-Cartón-QR", icon: Layers },
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
function normalizarQR(raw) {
  return raw
    .trim()
    .replace(/\u00d1/g, ":")
    .replace(/-{2,}/g, "//")
    .replace(/-/g, "/");
}

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
    setQuery(normalizarQR(search));
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
            onChange={(e) => {
              const v = e.target.value;
              // Auto-submit cuando el escaner termina (mete \n o \r al final)
              if (/[\r\n]$/.test(v)) {
                const clean = normalizarQR(v);
                setSearch(clean);
                setQuery(clean);
              } else {
                setSearch(v);
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text");
              const clean = normalizarQR(pasted);
              setSearch(clean);
              setQuery(clean);
            }}
            placeholder="Escanea o pega el QR (URL, escaneado o solo el código)..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 h-9 font-mono text-xs"
            autoFocus
          />
          {search && search !== query && (
            <p className="text-[10px] text-zinc-600 mt-1 font-mono">
              Se buscará: {normalizarQR(search)}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          className="bg-white text-zinc-950 hover:bg-zinc-100"
        >
          Buscar
        </Button>
        {query && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch("");
              setQuery("");
            }}
            className="border-white/10 text-zinc-400 hover:bg-white/5"
          >
            Limpiar
          </Button>
        )}
      </form>

      {isLoading && <p className="text-zinc-600 text-sm">Buscando...</p>}
      {error && (
        <p className="text-red-400 text-sm">
          {error.response?.data?.error || "QR no encontrado"}
        </p>
      )}

      {data && (
        <div className="space-y-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Información del QR
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[
                { label: "Código QR", value: data.codigo_qr, mono: true },
                { label: "UPC", value: data.upc, mono: true },
                { label: "SKU", value: data.sku_number || "—" },
                { label: "Style No", value: data.style_no || "—" },
                { label: "Producto", value: data.style_name || "—" },
                { label: "Talla", value: data.size || "—" },
                { label: "Color", value: `${data.color || ""} ${data.color_name ? "· " + data.color_name : ""}`.trim() || "—" },
                {
                  label: "Estado QR",
                  value: data.estado,
                  color:
                    data.estado === "enviado"
                      ? "text-violet-400"
                      : data.estado === "escaneado"
                        ? "text-blue-400"
                        : "text-emerald-400",
                },
                {
                  label: "Total escaneos",
                  value: data.total_escaneos || 0,
                },
              ].map(({ label, value, mono, color }) => (
                <div key={label}>
                  <p className="text-zinc-600 text-xs">{label}</p>
                  <p
                    className={`text-white font-medium ${mono ? "font-mono text-xs break-all" : ""} ${color || ""}`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {data.total_escaneos > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                Cadena de custodia (escaneo más reciente)
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
                    value: data.codigo_caja || "(sin caja, directo a cartón)",
                    sub: data.caja_estado,
                  },
                  {
                    label: "Cartón",
                    value: data.carton_id,
                    sub: `${data.carton_tipo || ""} · ${data.carton_estado || ""}`,
                  },
                  {
                    label: "Purchase Order",
                    value: data.po_number,
                    sub: `${data.po_estado} ${data.cfm_xf_date ? "· XF: " + data.cfm_xf_date : ""}`,
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
                          {sub && <p className="text-zinc-500 text-xs">{sub}</p>}
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

          {data.escaneos?.length > 1 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                Historial de escaneos ({data.escaneos.length})
              </p>
              <div className="space-y-2">
                {data.escaneos.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex gap-3">
                      <span className="text-zinc-500">{e.escaneado_por}</span>
                      <span className="text-white font-mono">
                        {e.codigo_caja || e.carton_id}
                      </span>
                      <span className="text-zinc-600">
                        PO {e.po_number}
                      </span>
                    </div>
                    <span className="text-zinc-500">
                      {new Date(e.escaneado_at).toLocaleString("es-MX")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.envios?.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
                Envíos a T4
              </p>
              <div className="space-y-2">
                {data.envios.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0"
                  >
                    <span
                      className={
                        e.estado === "enviado"
                          ? "text-violet-400"
                          : "text-red-400"
                      }
                    >
                      {e.estado}
                    </span>
                    <span className="text-zinc-500">
                      {new Date(
                        e.enviado_at || e.cancelado_at,
                      ).toLocaleString("es-MX")}
                    </span>
                  </div>
                ))}
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
  const [filters, setFilters] = useState({
    sku: "",
    estado: "",
    po_number: "",
    operador: "",
    fecha_desde: "",
    fecha_hasta: "",
  });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const debouncedFilters = {
    sku: useDebounce(filters.sku, 300),
    po_number: useDebounce(filters.po_number, 300),
    operador: useDebounce(filters.operador, 300),
    estado: filters.estado,
    fecha_desde: filters.fecha_desde,
    fecha_hasta: filters.fecha_hasta,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["cajas-sku", debouncedFilters, page],
    queryFn: () =>
      getCajasPorSKU({ ...debouncedFilters, page, limit: 50 }).then(
        (r) => r.data,
      ),
    keepPreviousData: true,
  });

  async function handleExport() {
    setExporting(true);
    try {
      const res = await getCajasPorSKU({ ...debouncedFilters, all: 1 });
      exportToExcel(
        (res.data.data || []).map((r) => ({
          "Código Caja": r.codigo_caja,
          "PO": r.po_number || "",
          "Cartón": r.carton_id || "",
          SKU: r.sku_number,
          Producto: r.style_name,
          Talla: r.size,
          Color: r.color_name,
          "Pares": r.cantidad_pares,
          "QRs Escaneados": r.qrs_escaneados,
          Estado: r.estado,
          "Creado Por": r.creado_por,
          Fecha: new Date(r.created_at).toLocaleString("es-MX"),
        })),
        "cajas-por-sku",
      );
    } finally {
      setExporting(false);
    }
  }

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="relative md:col-span-2">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
          />
          <Input
            value={filters.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="SKU..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-9"
          />
        </div>
        <Input
          value={filters.po_number}
          onChange={(e) => set("po_number", e.target.value)}
          placeholder="PO number..."
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-9"
        />
        <Input
          value={filters.operador}
          onChange={(e) => set("operador", e.target.value)}
          placeholder="Operador..."
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-9"
        />
        <Input
          type="date"
          value={filters.fecha_desde}
          onChange={(e) => set("fecha_desde", e.target.value)}
          className="bg-white/5 border-white/10 text-white h-9"
        />
        <Input
          type="date"
          value={filters.fecha_hasta}
          onChange={(e) => set("fecha_hasta", e.target.value)}
          className="bg-white/5 border-white/10 text-white h-9"
        />
      </div>
      <div className="flex items-center gap-3">
        <select
          value={filters.estado}
          onChange={(e) => set("estado", e.target.value)}
          className="h-9 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none"
        >
          <option value="" className="bg-zinc-900">
            Todos los estados
          </option>
          <option value="abierta" className="bg-zinc-900">
            Abiertas
          </option>
          <option value="empacada" className="bg-zinc-900">
            Empacadas
          </option>
        </select>
        <span className="text-xs text-zinc-500">
          {data?.total?.toLocaleString() || 0} resultados
        </span>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={!data?.total || exporting}
          className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 ml-auto"
        >
          <Download size={14} />
          {exporting ? "Exportando..." : "Exportar todo"}
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
                PO / Cartón
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
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-600">
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
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    <div>{r.po_number || "—"}</div>
                    <div className="text-zinc-600">{r.carton_id || ""}</div>
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

// --- Tab: Cartones pendientes ---
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
    const flat = [];
    pendientes.cartones_pendientes.forEach((c) => {
      (c.detalles || []).forEach((d) => {
        flat.push({
          "Cartón ID": c.carton_id,
          Tipo: c.tipo,
          "Estado Cartón": c.estado,
          SKU: d.sku_number,
          Producto: d.style_name,
          Talla: d.size,
          Color: d.color_name,
          Esperado: d.cantidad_esperada,
          Actual: d.cantidad_actual,
          Faltan: d.cantidad_esperada - d.cantidad_actual,
        });
      });
    });
    exportToExcel(flat, `cartones-pendientes-${poSeleccionada.po_number}`);
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
            <Download size={14} /> Exportar detalle
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
                    Progreso
                  </th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                    Detalle SKUs
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
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors align-top"
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
                      <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums">
                        {c.pares_escaneados}/{c.pares_esperados}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        <div className="space-y-1">
                          {(c.detalles || []).map((d, i) => {
                            const falta =
                              d.cantidad_esperada - d.cantidad_actual;
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-2 font-mono"
                              >
                                <span className="text-zinc-300">
                                  {d.sku_number}
                                </span>
                                <span
                                  className={
                                    falta > 0
                                      ? "text-amber-400"
                                      : "text-emerald-400"
                                  }
                                >
                                  {d.cantidad_actual}/{d.cantidad_esperada}
                                </span>
                                {falta > 0 && (
                                  <span className="text-zinc-600">
                                    (faltan {falta})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
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

// --- Tab: Detalle PO-Cartón-QR ---
function TabDetallePO() {
  const [search, setSearch] = useState("");
  const [poSeleccionada, setPoSeleccionada] = useState(null);
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: posData } = useQuery({
    queryKey: ["purchase-orders-detalle", debouncedSearch],
    queryFn: () =>
      getPurchaseOrders({
        search: debouncedSearch,
        estado: "",
        limit: 20,
      }).then((r) => r.data),
  });

  const { data: detalle, isLoading } = useQuery({
    queryKey: ["detalle-po", poSeleccionada?.id],
    queryFn: () =>
      getDetalleCartonesPorPO(poSeleccionada.id).then((r) => r.data),
    enabled: !!poSeleccionada,
  });

  async function handleExport() {
    if (!detalle) return;
    setExporting(true);
    try {
      exportToExcel(
        detalle.detalles.map((r) => ({
          PO: r.po_number,
          "Cartón ID": r.carton_id,
          "Tipo Cartón": r.carton_tipo,
          "Estado Cartón": r.carton_estado,
          "Código Caja": r.codigo_caja || "",
          "Estado Caja": r.caja_estado || "",
          SKU: r.sku_number || "",
          "Style No": r.style_no || "",
          Producto: r.style_name || "",
          Talla: r.size || "",
          Color: r.color || "",
          "Nombre Color": r.color_name || "",
          "Código QR": r.codigo_qr || "",
          UPC: r.upc || "",
          "Estado QR": r.qr_estado || "",
          "Escaneado Por": r.escaneado_por || "",
          "Fecha Escaneo": r.escaneado_at
            ? new Date(r.escaneado_at).toLocaleString("es-MX")
            : "",
        })),
        `detalle-${detalle.po.po_number}`,
      );
    } finally {
      setExporting(false);
    }
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
            disabled={!detalle?.total || exporting}
            className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 ml-auto"
          >
            <Download size={14} />
            {exporting ? "Exportando..." : "Exportar Excel"}
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
                {po.cantidad_pares} pares · {po.total_cartones} cartones
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
              {detalle?.total?.toLocaleString() || 0} filas
            </span>
          </div>
          <div className="rounded-xl border border-white/5 overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-950">
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium text-xs">
                    Cartón
                  </th>
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium text-xs">
                    Caja
                  </th>
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium text-xs">
                    SKU
                  </th>
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium text-xs">
                    QR
                  </th>
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium text-xs">
                    Operador
                  </th>
                  <th className="text-left px-3 py-2 text-zinc-500 font-medium text-xs">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-zinc-600"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : (detalle?.detalles || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-zinc-600"
                    >
                      Sin escaneos registrados
                    </td>
                  </tr>
                ) : (
                  (detalle?.detalles || []).map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-2 text-white font-mono text-xs">
                        {r.carton_id}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 font-mono text-xs">
                        {r.codigo_caja || "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-300 font-mono text-xs">
                        {r.sku_number}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 font-mono text-[10px] break-all max-w-xs">
                        {r.codigo_qr}
                      </td>
                      <td className="px-3 py-2 text-zinc-400 text-xs">
                        {r.escaneado_por}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 text-xs">
                        {r.escaneado_at
                          ? new Date(r.escaneado_at).toLocaleString("es-MX")
                          : "—"}
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
        "CFM XF Date": r.cfm_xf_date || "",
        "Cant. Pares": r.cantidad_pares,
        "Cant. Cartones": r.cantidad_cartones,
        "QRs Asociados": r.qrs_asociados,
        Estado: r.estado,
        "Enviado At": r.enviado_at
          ? new Date(r.enviado_at).toLocaleString("es-MX")
          : "",
        "Cancelado At": r.cancelado_at
          ? new Date(r.cancelado_at).toLocaleString("es-MX")
          : "",
        "Respuesta API": r.respuesta_success || "",
        "Error Code": r.respuesta_error_code || "",
        Mensaje: r.respuesta_mensaje || "",
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
                PO
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Estado
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Pares
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Cartones
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                QRs
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Fecha
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Respuesta T4
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
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-600">
                  Sin envíos registrados
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors align-top"
                >
                  <td className="px-4 py-3 text-white font-mono text-xs font-medium">
                    {r.po_number}
                    {r.cfm_xf_date && (
                      <div className="text-zinc-600 text-[10px] font-normal mt-0.5">
                        XF: {r.cfm_xf_date}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium ${ESTADO_STYLES[r.estado]}`}
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                    {Number(r.cantidad_pares).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">
                    {r.cantidad_cartones}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
                    {Number(r.qrs_asociados || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {r.enviado_at
                      ? new Date(r.enviado_at).toLocaleString("es-MX")
                      : r.cancelado_at
                        ? new Date(r.cancelado_at).toLocaleString("es-MX")
                        : new Date(r.created_at).toLocaleString("es-MX")}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs">
                    {r.respuesta_success && (
                      <div
                        className={
                          String(r.respuesta_success).toLowerCase() === "true"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {r.respuesta_success}
                      </div>
                    )}
                    {r.respuesta_error_code && (
                      <div className="text-red-400 font-mono text-[10px]">
                        {r.respuesta_error_code}
                      </div>
                    )}
                    {r.respuesta_mensaje && (
                      <div
                        className="text-zinc-500 text-[10px] truncate"
                        title={r.respuesta_mensaje}
                      >
                        {r.respuesta_mensaje}
                      </div>
                    )}
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
    "detalle-po": <TabDetallePO />,
    "sin-sku": <TabQRsSinSKU />,
    envios: <TabEnviosT4 />,
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Reportes"
        description="Análisis y trazabilidad del sistema"
      />

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
