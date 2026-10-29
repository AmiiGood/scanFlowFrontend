import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getProduccionPorDia,
  getTrazabilidadQR,
  getCajasPorSKU,
  getQrsSinSKUPorUPC,
  getHistorialEnviosT4,
  getCartonesPendientesPorPO,
  getDetalleCartonesPorPO,
  getPOsReporte,
  getDetalleCajas,
  getDetalleQRs,
  descargarDetalleCajas,
  descargarDetalleQRs,
  getUsuariosReporte,
} from "@/api/reports";
import { getLiberaciones } from "@/api/supervisores";
import { getReseteos } from "@/api/reset";
import { exportToExcel, guardarExcel, mensajeDeError } from "@/lib/exportExcel";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { ArrowLeft, Search, X } from "lucide-react";
import {
  BarraAvance,
  Boton,
  Kpi,
  BotonExportar,
  Campo,
  Estado,
  FilaMensaje,
  PageTitle,
  Paginacion,
  Panel,
  Tabla,
} from "@/components/reportes/kit";
import { GraficaBarras, Leyenda } from "@/components/reportes/graficas";
import { COLOR, inputCls, td, tdMono, tdNum, th, thNum } from "@/components/reportes/estilos";
import { fmtFecha, fmtFechaHora, fmtHora12, fmtNum } from "@/lib/formato";

const TABS = [
  { id: "produccion", label: "Producción por día" },
  { id: "trazabilidad", label: "Trazabilidad QR" },
  { id: "cajas", label: "Cajas por SKU" },
  { id: "pendientes", label: "Cartones pendientes" },
  { id: "detalle-po", label: "Detalle PO-Cartón-QR" },
  { id: "detalle-cajas", label: "Detalle Caja-QR" },
  { id: "detalle-qrs", label: "Detalle QR" },
  { id: "sin-sku", label: "QRs sin SKU" },
  { id: "envios", label: "Historial T4" },
  { id: "liberaciones", label: "Liberaciones" },
  { id: "reseteos", label: "Reseteos" },
];

// Mantiene la página anterior visible mientras llega la siguiente.
const conservar = (prev) => prev;

const selectCls = cn(inputCls, "w-auto pr-8");

// --- Tab: Producción por día ---
function TabProduccion() {
  const [dias, setDias] = useState(30);
  const { data = [], isLoading } = useQuery({
    queryKey: ["reporte-produccion-dia", dias],
    queryFn: () => getProduccionPorDia(dias).then((r) => r.data),
  });

  const serie = [...data].reverse().map((r) => ({
    fecha: r.fecha,
    pares: +r.qrs_escaneados,
    abiertas: +r.cajas_abiertas,
    cerradas: +r.cajas_cerradas,
  }));
  const total = serie.reduce(
    (a, r) => ({ pares: a.pares + r.pares, abiertas: a.abiertas + r.abiertas, cerradas: a.cerradas + r.cerradas }),
    { pares: 0, abiertas: 0, cerradas: 0 },
  );
  const corta = (f) => fmtFecha(f).slice(0, 5);

  function handleExport() {
    exportToExcel(
      data.map((r) => ({
        Fecha: fmtFecha(r.fecha),
        "QRs Escaneados": Number(r.qrs_escaneados),
        "Cajas Abiertas": Number(r.cajas_abiertas),
        "Cajas Cerradas": Number(r.cajas_cerradas),
        "Operadores Activos": Number(r.operadores_activos),
      })),
      `produccion-por-dia-${dias}d`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={dias} onChange={(e) => setDias(parseInt(e.target.value))} className={selectCls}>
          {[7, 15, 30, 60, 90].map((d) => (
            <option key={d} value={d}>Últimos {d} días</option>
          ))}
        </select>
        <p className="text-sm text-zinc-500 tabular-nums">
          {fmtNum(total.pares)} pares · {fmtNum(total.abiertas)} cajas abiertas · {fmtNum(total.cerradas)} cerradas
        </p>
        <div className="ml-auto">
          <BotonExportar onClick={handleExport} disabled={!data.length} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="Pares escaneados por día">
          <GraficaBarras
            data={serie}
            x="fecha"
            barras={[{ key: "pares", label: "Pares", color: COLOR.principal }]}
            etiquetaX={corta}
            etiquetaGlobo={fmtFecha}
          />
        </Panel>
        <Panel
          title="Cajas abiertas y cerradas por día"
          actions={
            <Leyenda items={[{ label: "Abiertas", color: COLOR.claro }, { label: "Cerradas", color: COLOR.principal }]} />
          }
        >
          <GraficaBarras
            data={serie}
            x="fecha"
            barras={[
              { key: "abiertas", label: "Abiertas", color: COLOR.claro },
              { key: "cerradas", label: "Cerradas", color: COLOR.principal },
            ]}
            etiquetaX={corta}
            etiquetaGlobo={fmtFecha}
          />
        </Panel>
      </div>

      <Panel flush>
        <Tabla>
          <thead>
            <tr>
              <th className={th}>Fecha</th>
              <th className={thNum}>QRs escaneados</th>
              <th className={thNum}>Cajas abiertas</th>
              <th className={thNum}>Cajas cerradas</th>
              <th className={thNum}>Operadores activos</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={5}>Cargando…</FilaMensaje>
            ) : data.length === 0 ? (
              <FilaMensaje cols={5}>Sin producción en este periodo</FilaMensaje>
            ) : (
              data.map((r) => (
                <tr key={r.fecha} className="hover:bg-zinc-50">
                  <td className={cn(td, "tabular-nums text-zinc-900")}>{fmtFecha(r.fecha)}</td>
                  <td className={cn(tdNum, "font-medium text-zinc-900")}>{fmtNum(r.qrs_escaneados)}</td>
                  <td className={tdNum}>{fmtNum(r.cajas_abiertas)}</td>
                  <td className={tdNum}>{fmtNum(r.cajas_cerradas)}</td>
                  <td className={tdNum}>{fmtNum(r.operadores_activos)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
      </Panel>
    </div>
  );
}

// --- Tab: Trazabilidad QR ---
function normalizarQR(raw) {
  return raw
    .trim()
    .replace(/Ñ/g, ":")
    .replace(/-{2,}/g, "//")
    .replace(/-/g, "/");
}

function Dato({ label, children, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={cn("text-sm text-zinc-900 mt-0.5", mono && "font-mono text-xs break-all")}>{children || "—"}</dd>
    </div>
  );
}

function TabTrazabilidad() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["trazabilidad-qr", query],
    queryFn: () => getTrazabilidadQR(query).then((r) => r.data),
    enabled: !!query,
  });

  function buscar(valor) {
    const limpio = normalizarQR(valor);
    setSearch(limpio);
    setQuery(limpio);
  }

  const cadena = data
    ? [
        { paso: "Escaneo en Producción", valor: data.escaneado_por, detalle: data.escaneado_at && <span className="text-xs text-zinc-500">{new Date(data.escaneado_at).toLocaleString("es-MX")}</span> },
        { paso: "Caja", valor: data.codigo_caja || "Directo a cartón", detalle: data.caja_estado && <Estado valor={data.caja_estado} /> },
        { paso: "Cartón", valor: data.carton_id, detalle: data.carton_tipo && (<span className="flex gap-1.5"><Estado valor={data.carton_tipo} /><Estado valor={data.carton_estado} /></span>) },
        { paso: "Purchase order", valor: data.po_number, detalle: data.po_estado && (<span className="flex items-center gap-1.5"><Estado valor={data.po_estado} />{data.cfm_xf_date && <span className="text-xs text-zinc-500">XF {fmtFecha(data.cfm_xf_date)}</span>}</span>) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            buscar(search);
          }}
          className="flex flex-wrap items-end gap-3 pt-5"
        >
          <Campo label="Código QR" className="flex-1 min-w-72 max-w-2xl">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  // Auto-busca cuando el escáner termina (mete \n o \r al final)
                  if (/[\r\n]$/.test(v)) buscar(v);
                  else setSearch(v);
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  buscar(e.clipboardData.getData("text"));
                }}
                placeholder="Escanea o pega el QR: URL completa, lectura del escáner o solo el código"
                className={cn(inputCls, "pl-9 font-mono text-xs")}
                autoFocus
              />
            </div>
          </Campo>
          <Boton type="submit">Buscar</Boton>
          {query && (
            <Boton variante="secundario" onClick={() => { setSearch(""); setQuery(""); }}>
              <X size={14} /> Limpiar
            </Boton>
          )}
        </form>
        {search && search !== query && (
          <p className="text-xs text-zinc-500 font-mono mt-2">Se buscará: {normalizarQR(search)}</p>
        )}
      </Panel>

      {isLoading && <p className="text-sm text-zinc-500">Buscando…</p>}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error.response?.data?.error || "QR no encontrado"}
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
          <Panel className="xl:col-span-2" title="Código QR" actions={<Estado valor={data.estado} />}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2"><Dato label="Código" mono>{data.codigo_qr}</Dato></div>
              <Dato label="UPC" mono>{data.upc}</Dato>
              <Dato label="SKU" mono>{data.sku_number}</Dato>
              <Dato label="Style No">{data.style_no}</Dato>
              <Dato label="Talla">{data.size}</Dato>
              <Dato label="Producto">{data.style_name}</Dato>
              <Dato label="Color">{[data.color, data.color_name].filter(Boolean).join(" · ")}</Dato>
              <Dato label="Escaneos">{fmtNum(data.total_escaneos)}</Dato>
            </dl>
          </Panel>

          <div className="xl:col-span-3 space-y-4">
            {data.total_escaneos > 0 && (
              <Panel title="Cadena de custodia" subtitle="Escaneo más reciente">
                <ol className="relative border-l border-zinc-200 ml-1.5 space-y-4">
                  {cadena.filter((c) => c.valor).map((c) => (
                    <li key={c.paso} className="relative pl-5">
                      <span className="absolute -left-[5.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                      <p className="text-xs text-zinc-500">{c.paso}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-zinc-900">{c.valor}</span>
                        {c.detalle}
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}

            {data.escaneos?.length > 1 && (
              <Panel title={`Historial de escaneos (${data.escaneos.length})`} flush>
                <Tabla>
                  <tbody>
                    {data.escaneos.map((e) => (
                      <tr key={e.id}>
                        <td className={cn(td, "text-zinc-500 tabular-nums whitespace-nowrap")}>{new Date(e.escaneado_at).toLocaleString("es-MX")}</td>
                        <td className={tdMono}>{e.codigo_caja || e.carton_id}</td>
                        <td className={td}>{e.po_number ? `PO ${e.po_number}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              </Panel>
            )}

            {data.envios?.length > 0 && (
              <Panel title="Envíos a T4" flush>
                <Tabla>
                  <tbody>
                    {data.envios.map((e, i) => (
                      <tr key={i}>
                        <td className={td}><Estado valor={e.estado} /></td>
                        <td className={cn(td, "text-zinc-500 text-right tabular-nums")}>
                          {new Date(e.enviado_at || e.cancelado_at).toLocaleString("es-MX")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Filtro por usuario (cada línea de Producción tiene el suyo).
function CampoUsuario({ value, onChange, label = "Usuario" }) {
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-reporte"],
    queryFn: () => getUsuariosReporte().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <Campo label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">Todos</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre}{u.activo ? "" : " (inactivo)"}
          </option>
        ))}
      </select>
    </Campo>
  );
}

// --- Tab: Cajas por SKU ---
function TabCajas() {
  const [filters, setFilters] = useState({ sku: "", estado: "", po_number: "", fecha_desde: "", fecha_hasta: "", usuario: "" });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [errorExport, setErrorExport] = useState("");

  const debouncedFilters = {
    sku: useDebounce(filters.sku, 300),
    po_number: useDebounce(filters.po_number, 300),
    estado: filters.estado,
    fecha_desde: filters.fecha_desde,
    fecha_hasta: filters.fecha_hasta,
    usuario: filters.usuario,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["cajas-sku", debouncedFilters, page],
    queryFn: () => getCajasPorSKU({ ...debouncedFilters, page, limit: 50 }).then((r) => r.data),
    placeholderData: conservar,
  });

  async function handleExport() {
    setExporting(true);
    setErrorExport("");
    try {
      const res = await getCajasPorSKU({ ...debouncedFilters, all: 1 });
      exportToExcel(
        (res.data.data || []).map((r) => ({
          "Código Caja": r.codigo_caja,
          PO: r.po_number || "",
          Cartón: r.carton_id || "",
          SKU: r.sku_number,
          Producto: r.style_name,
          Talla: r.size,
          Color: r.color_name,
          Pares: r.cantidad_pares,
          "QRs Escaneados": r.qrs_escaneados,
          Estado: r.estado,
          Usuario: r.usuario || "",
          "Fecha y hora": fmtFechaHora(r.fecha_hora),
        })),
        "cajas-por-sku",
      );
    } catch (e) {
      setErrorExport(await mensajeDeError(e));
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
      <Panel>
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 pt-5">
          <Campo label="SKU" className="col-span-2">
            <input value={filters.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Ej. 10001-001-M7W9" className={inputCls} />
          </Campo>
          <Campo label="PO">
            <input value={filters.po_number} onChange={(e) => set("po_number", e.target.value)} placeholder="Número de PO" className={inputCls} />
          </Campo>
          <Campo label="Estado">
            <select value={filters.estado} onChange={(e) => set("estado", e.target.value)} className={inputCls}>
              <option value="">Todas</option>
              <option value="abierta">Abiertas</option>
              <option value="empacada">Empacadas</option>
            </select>
          </Campo>
          <Campo label="Abiertas desde">
            <input type="date" value={filters.fecha_desde} onChange={(e) => set("fecha_desde", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={filters.fecha_hasta} onChange={(e) => set("fecha_hasta", e.target.value)} className={inputCls} />
          </Campo>
          <CampoUsuario value={filters.usuario} onChange={(v) => set("usuario", v)} />
        </div>
      </Panel>

      <Panel
        title={`${fmtNum(data?.total)} cajas`}
        actions={<BotonExportar onClick={handleExport} disabled={!data?.total} cargando={exporting} error={errorExport}>Exportar todo</BotonExportar>}
        flush
      >
        <Tabla>
          <thead>
            <tr>
              <th className={th}>Código de caja</th>
              <th className={th}>PO / Cartón</th>
              <th className={th}>SKU</th>
              <th className={th}>Talla</th>
              <th className={thNum}>Pares</th>
              <th className={thNum}>Escaneados</th>
              <th className={th}>Estado</th>
              <th className={th}>Usuario</th>
              <th className={th}>Fecha y hora</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={9}>Cargando…</FilaMensaje>
            ) : !data?.data?.length ? (
              <FilaMensaje cols={9}>Sin cajas con estos filtros</FilaMensaje>
            ) : (
              data.data.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className={tdMono}>{r.codigo_caja}</td>
                  <td className={cn(td, "font-mono text-xs")}>
                    {r.po_number ? (<><div className="text-zinc-900">{r.po_number}</div><div className="text-zinc-500">{r.carton_id}</div></>) : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className={cn(td, "font-mono text-xs")}>{r.sku_number}</td>
                  <td className={td}>{r.size}</td>
                  <td className={tdNum}>{r.cantidad_pares}</td>
                  <td className={cn(tdNum, +r.qrs_escaneados < r.cantidad_pares ? "text-amber-700 font-medium" : "text-zinc-900")}>{r.qrs_escaneados}</td>
                  <td className={td}><Estado valor={r.estado} /></td>
                  <td className={cn(td, "whitespace-nowrap text-xs")}>{r.usuario || "—"}</td>
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs text-zinc-500")}>{fmtFechaHora(r.fecha_hora)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
        <Paginacion page={data?.page || 1} pages={data?.pages || 1} total={data?.total || 0} limit={50} onPage={setPage} />
      </Panel>
    </div>
  );
}

// --- Lista de POs para elegir (Cartones pendientes y Detalle PO) ---
function ElegirPO({ search, setSearch, pos, cargando, titulo, vacio, onSelect }) {
  return (
    <Panel
      title={cargando ? "Cargando POs…" : titulo(pos.length)}
      actions={
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar PO" className={cn(inputCls, "pl-9")} />
        </div>
      }
      flush
    >
      {!cargando && pos.length === 0 ? (
        <p className="px-5 pb-8 pt-4 text-center text-sm text-zinc-500">{vacio}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100 max-h-[640px] overflow-y-auto">
          {pos.map((po) => (
            <li key={po.id}>
              <button
                onClick={() => onSelect(po)}
                className="w-full grid grid-cols-[120px_100px_minmax(0,1fr)_200px] items-center gap-4 px-5 py-3 text-left hover:bg-zinc-50"
              >
                <span className="font-mono text-xs text-zinc-900 font-medium">{po.po_number}</span>
                <Estado valor={po.estado} />
                <BarraAvance valor={+po.cartones_completos} total={+po.total_cartones} />
                <span className="text-xs text-zinc-500 text-right tabular-nums">
                  {fmtNum(po.cartones_completos)}/{fmtNum(po.total_cartones)} cartones
                  {+po.cartones_pendientes > 0 && ` · faltan ${fmtNum(po.cartones_pendientes)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function EncabezadoPO({ po, onBack, children, acciones }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 hover:bg-zinc-50">
        <ArrowLeft size={14} /> Cambiar PO
      </button>
      <span className="font-mono text-sm font-semibold text-zinc-900">PO {po.po_number}</span>
      <Estado valor={po.estado} />
      <span className="text-sm text-zinc-500">{children}</span>
      <div className="ml-auto">{acciones}</div>
    </div>
  );
}

// --- Tab: Cartones pendientes ---
function TabPendientes() {
  const [search, setSearch] = useState("");
  const [poSeleccionada, setPoSeleccionada] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  // Todas las POs con al menos un cartón pendiente (antes solo las 20 más recientes).
  const { data: pos = [], isLoading: cargandoPOs } = useQuery({
    queryKey: ["reporte-pos-pendientes", debouncedSearch],
    queryFn: () => getPOsReporte({ filtro: "pendientes", search: debouncedSearch }).then((r) => r.data),
  });

  const { data: pendientes, isLoading } = useQuery({
    queryKey: ["cartones-pendientes", poSeleccionada?.id],
    queryFn: () => getCartonesPendientesPorPO(poSeleccionada.id).then((r) => r.data),
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

  if (!poSeleccionada) {
    return (
      <ElegirPO
        search={search}
        setSearch={setSearch}
        pos={pos}
        cargando={cargandoPOs}
        titulo={(n) => `${fmtNum(n)} POs con cartones pendientes`}
        vacio="No hay POs con cartones pendientes"
        onSelect={setPoSeleccionada}
      />
    );
  }

  const cartones = pendientes?.cartones_pendientes || [];
  return (
    <div className="space-y-4">
      <EncabezadoPO
        po={poSeleccionada}
        onBack={() => setPoSeleccionada(null)}
        acciones={<BotonExportar onClick={handleExport} disabled={!cartones.length}>Exportar detalle</BotonExportar>}
      >
        {fmtNum(cartones.length)} cartones pendientes de {fmtNum(poSeleccionada.total_cartones)}
      </EncabezadoPO>
      <Panel flush>
        <Tabla>
          <thead>
            <tr>
              <th className={th}>Cartón</th>
              <th className={th}>Tipo</th>
              <th className={cn(th, "w-56")}>Avance</th>
              <th className={th}>Detalle por SKU</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={4}>Cargando…</FilaMensaje>
            ) : cartones.length === 0 ? (
              <FilaMensaje cols={4}>Esta PO ya no tiene cartones pendientes</FilaMensaje>
            ) : (
              cartones.map((c) => (
                <tr key={c.id} className="align-top hover:bg-zinc-50">
                  <td className={tdMono}>{c.carton_id}</td>
                  <td className={td}><Estado valor={c.tipo} /></td>
                  <td className={td}>
                    <BarraAvance valor={+c.pares_escaneados} total={+c.pares_esperados} className="mt-1.5" />
                    <p className="text-xs text-zinc-500 mt-1 tabular-nums">{c.pares_escaneados} de {c.pares_esperados} pares</p>
                  </td>
                  <td className={td}>
                    <div className="space-y-1">
                      {(c.detalles || []).map((d, i) => {
                        const falta = d.cantidad_esperada - d.cantidad_actual;
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-zinc-900">{d.sku_number}</span>
                            <span className={cn("tabular-nums", falta > 0 ? "text-amber-700" : "text-emerald-700")}>
                              {d.cantidad_actual}/{d.cantidad_esperada}
                            </span>
                            {falta > 0 && <span className="text-zinc-500">faltan {falta}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
      </Panel>
    </div>
  );
}

// --- Tab: Detalle PO-Cartón-QR ---
function TabDetallePO() {
  const [search, setSearch] = useState("");
  const [poSeleccionada, setPoSeleccionada] = useState(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: pos = [], isLoading: cargandoPOs } = useQuery({
    queryKey: ["reporte-pos-con-escaneos", debouncedSearch],
    queryFn: () => getPOsReporte({ filtro: "con_escaneos", search: debouncedSearch }).then((r) => r.data),
  });

  const { data: detalle, isLoading } = useQuery({
    queryKey: ["detalle-po", poSeleccionada?.id],
    queryFn: () => getDetalleCartonesPorPO(poSeleccionada.id).then((r) => r.data),
    enabled: !!poSeleccionada,
  });

  function handleExport() {
    if (!detalle) return;
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
        "Fecha Escaneo": r.escaneado_at ? new Date(r.escaneado_at).toLocaleString("es-MX") : "",
      })),
      `detalle-${detalle.po.po_number}`,
    );
  }

  if (!poSeleccionada) {
    return (
      <ElegirPO
        search={search}
        setSearch={setSearch}
        pos={pos}
        cargando={cargandoPOs}
        titulo={(n) => `${fmtNum(n)} POs con escaneos`}
        vacio="Ninguna PO tiene escaneos todavía"
        onSelect={setPoSeleccionada}
      />
    );
  }

  const filas = detalle?.detalles || [];
  return (
    <div className="space-y-4">
      <EncabezadoPO
        po={poSeleccionada}
        onBack={() => setPoSeleccionada(null)}
        acciones={<BotonExportar onClick={handleExport} disabled={!filas.length} />}
      >
        {fmtNum(detalle?.total)} pares registrados
      </EncabezadoPO>
      <Panel flush>
        <div className="max-h-[640px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={th}>Cartón</th>
                <th className={th}>Caja</th>
                <th className={th}>SKU</th>
                <th className={th}>Código QR</th>
                <th className={th}>Fecha y hora</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <FilaMensaje cols={5}>Cargando…</FilaMensaje>
              ) : filas.length === 0 ? (
                <FilaMensaje cols={5}>Sin escaneos registrados</FilaMensaje>
              ) : (
                filas.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className={tdMono}>{r.carton_id}</td>
                    <td className={cn(td, "font-mono text-xs")}>{r.codigo_caja || "—"}</td>
                    <td className={cn(td, "font-mono text-xs")}>{r.sku_number}</td>
                    <td className={cn(td, "font-mono text-[11px] text-zinc-500 break-all")}>{r.codigo_qr}</td>
                    <td className={cn(td, "whitespace-nowrap tabular-nums text-xs text-zinc-500")}>
                      {r.escaneado_at ? new Date(r.escaneado_at).toLocaleString("es-MX") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// --- Tab: Detalle Caja-QR ---
// Columnas del reporte, en el mismo orden en pantalla y en Excel.
const COLUMNAS_CAJA_QR = [
  { titulo: "fecha", valor: (r) => r.escaneado_at, tipo: "fecha", ancho: 12 },
  { titulo: "hora", valor: (r) => r.escaneado_at, tipo: "hora", ancho: 14 },
  { titulo: "turno", valor: (r) => r.turno, ancho: 10 },
  { titulo: "usuario", valor: (r) => r.usuario, ancho: 16 },
  { titulo: "codigo_qr", valor: (r) => r.codigo_qr, ancho: 42 },
  { titulo: "token", valor: (r) => r.token, ancho: 16 },
  { titulo: "caja", valor: (r) => r.codigo_caja, ancho: 34 },
  { titulo: "sku", valor: (r) => r.sku_number, ancho: 18 },
  { titulo: "talla", valor: (r) => r.size, ancho: 8 },
];

// Fecha local de hoy en formato de <input type="date">.
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function TabDetalleCajas() {
  // Arranca en el día de hoy: sin fechas, la primera página serían los
  // escaneos más viejos.
  const [filters, setFilters] = useState(() => ({ codigo: "", sku: "", po_number: "", estado: "", turno: "", usuario: "", fecha_desde: hoyLocal(), fecha_hasta: hoyLocal() }));
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [errorExport, setErrorExport] = useState("");

  const debouncedFilters = {
    codigo: useDebounce(filters.codigo, 300),
    sku: useDebounce(filters.sku, 300),
    po_number: useDebounce(filters.po_number, 300),
    estado: filters.estado,
    turno: filters.turno,
    usuario: filters.usuario,
    fecha_desde: filters.fecha_desde,
    fecha_hasta: filters.fecha_hasta,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["detalle-cajas", debouncedFilters, page],
    queryFn: () => getDetalleCajas({ ...debouncedFilters, page, limit: 100 }).then((r) => r.data),
    placeholderData: conservar,
  });

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    setErrorExport("");
    try {
      const res = await descargarDetalleCajas(debouncedFilters);
      const rango = [filters.fecha_desde, filters.fecha_hasta].filter(Boolean).join("_a_");
      const sufijo = [rango, filters.turno && `turno-${filters.turno}`].filter(Boolean).join("-");
      guardarExcel(res.data, `detalle-caja-qr${sufijo ? "-" + sufijo : ""}`);
    } catch (e) {
      setErrorExport(await mensajeDeError(e));
    } finally {
      setExporting(false);
    }
  }

  const filas = data?.data || [];
  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid grid-cols-2 lg:grid-cols-9 gap-3 pt-5">
          <Campo label="Código de caja" className="col-span-2">
            <input value={filters.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Todo o parte del código" className={cn(inputCls, "font-mono")} />
          </Campo>
          <Campo label="SKU">
            <input value={filters.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="PO">
            <input value={filters.po_number} onChange={(e) => set("po_number", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Estado de la caja">
            <select value={filters.estado} onChange={(e) => set("estado", e.target.value)} className={inputCls}>
              <option value="">Todas</option>
              <option value="abierta">Abiertas</option>
              <option value="empacada">Empacadas</option>
            </select>
          </Campo>
          <Campo label="Escaneado desde">
            <input type="date" value={filters.fecha_desde} onChange={(e) => set("fecha_desde", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={filters.fecha_hasta} onChange={(e) => set("fecha_hasta", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Turno">
            <select value={filters.turno} onChange={(e) => set("turno", e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              <option value="A">A · 08:00–16:00</option>
              <option value="B">B · 16:00–24:00</option>
              <option value="C">C · 00:00–08:00</option>
            </select>
          </Campo>
          <CampoUsuario value={filters.usuario} onChange={(v) => set("usuario", v)} />
        </div>
      </Panel>

      <Panel
        title={`${fmtNum(data?.total)} pares en ${fmtNum(data?.cajas)} cajas`}
        actions={<BotonExportar onClick={handleExport} disabled={!data?.total} cargando={exporting} error={errorExport}>Exportar todo</BotonExportar>}
        flush
      >
        <Tabla>
          <thead>
            <tr>
              {COLUMNAS_CAJA_QR.map((c) => (
                <th key={c.titulo} className={th}>{c.titulo}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={COLUMNAS_CAJA_QR.length}>Cargando…</FilaMensaje>
            ) : filas.length === 0 ? (
              <FilaMensaje cols={COLUMNAS_CAJA_QR.length}>Sin escaneos con estos filtros</FilaMensaje>
            ) : (
              filas.map((r) => (
                <tr key={`${r.caja_id}-${r.codigo_qr}`} className="hover:bg-zinc-50">
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs")}>{fmtFecha(r.escaneado_at)}</td>
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs")}>{fmtHora12(r.escaneado_at)}</td>
                  <td className={cn(td, "whitespace-nowrap text-xs")}>{r.turno}</td>
                  <td className={cn(td, "whitespace-nowrap text-xs")}>{r.usuario || "—"}</td>
                  <td className={cn(td, "font-mono text-[11px] text-zinc-500 whitespace-nowrap")}>{r.codigo_qr}</td>
                  <td className={cn(td, "font-mono text-xs text-zinc-900")}>{r.token}</td>
                  <td className={cn(td, "font-mono text-xs whitespace-nowrap")}>{r.codigo_caja}</td>
                  <td className={cn(td, "font-mono text-xs whitespace-nowrap")}>{r.sku_number}</td>
                  <td className={cn(td, "text-xs")}>{r.size}</td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
        <Paginacion page={data?.page || 1} pages={data?.pages || 1} total={data?.total || 0} limit={100} onPage={setPage} />
      </Panel>
    </div>
  );
}

// --- Tab: Detalle QR ---
// Una fila por QR ya usado (escaneado o enviado) con todo su recorrido. En
// pantalla van las columnas principales; el Excel lleva todas.
const COLUMNAS_QR_PANTALLA = ["fecha", "hora", "turno", "usuario", "token", "sku", "talla", "caja", "cartón", "PO", "estado"];

function TabDetalleQRs() {
  const [filters, setFilters] = useState(() => ({
    codigo: "", sku: "", caja: "", po_number: "", estado: "", embarcado: "", turno: "", usuario: "",
    fecha_desde: hoyLocal(), fecha_hasta: hoyLocal(),
  }));
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [errorExport, setErrorExport] = useState("");

  const debouncedFilters = {
    codigo: useDebounce(filters.codigo, 300),
    sku: useDebounce(filters.sku, 300),
    caja: useDebounce(filters.caja, 300),
    po_number: useDebounce(filters.po_number, 300),
    estado: filters.estado,
    embarcado: filters.embarcado,
    turno: filters.turno,
    usuario: filters.usuario,
    fecha_desde: filters.fecha_desde,
    fecha_hasta: filters.fecha_hasta,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["detalle-qrs", debouncedFilters, page],
    queryFn: () => getDetalleQRs({ ...debouncedFilters, page, limit: 100 }).then((r) => r.data),
    placeholderData: conservar,
  });

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    setErrorExport("");
    try {
      const res = await descargarDetalleQRs(debouncedFilters);
      const rango = [filters.fecha_desde, filters.fecha_hasta].filter(Boolean).join("_a_");
      const sufijo = [rango, filters.turno && `turno-${filters.turno}`].filter(Boolean).join("-");
      guardarExcel(res.data, `detalle-qr${sufijo ? "-" + sufijo : ""}`);
    } catch (e) {
      setErrorExport(await mensajeDeError(e));
    } finally {
      setExporting(false);
    }
  }

  const filas = data?.data || [];
  const cols = COLUMNAS_QR_PANTALLA.length;
  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-5">
          <Campo label="Código QR o token" className="col-span-2">
            <input value={filters.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Todo o parte del código" className={cn(inputCls, "font-mono")} />
          </Campo>
          <Campo label="SKU">
            <input value={filters.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Caja">
            <input value={filters.caja} onChange={(e) => set("caja", e.target.value)} className={cn(inputCls, "font-mono")} />
          </Campo>
          <Campo label="PO">
            <input value={filters.po_number} onChange={(e) => set("po_number", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Estado del QR">
            <select value={filters.estado} onChange={(e) => set("estado", e.target.value)} className={inputCls}>
              <option value="">Escaneados y enviados</option>
              <option value="escaneado">Escaneados</option>
              <option value="enviado">Enviados</option>
            </select>
          </Campo>
          <Campo label="Embarque">
            <select value={filters.embarcado} onChange={(e) => set("embarcado", e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              <option value="si">Ya en cartón</option>
              <option value="no">Sin cartón</option>
            </select>
          </Campo>
          <Campo label="Escaneado desde">
            <input type="date" value={filters.fecha_desde} onChange={(e) => set("fecha_desde", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={filters.fecha_hasta} onChange={(e) => set("fecha_hasta", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Turno">
            <select value={filters.turno} onChange={(e) => set("turno", e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              <option value="A">A · 08:00–16:00</option>
              <option value="B">B · 16:00–24:00</option>
              <option value="C">C · 00:00–08:00</option>
            </select>
          </Campo>
          <CampoUsuario value={filters.usuario} onChange={(v) => set("usuario", v)} />
        </div>
      </Panel>

      <Panel
        title={`${fmtNum(data?.total)} QRs`}
        subtitle={data ? `${fmtNum(data.embarcados)} ya en cartón · ${fmtNum(data.enviados)} enviados a T4` : undefined}
        actions={<BotonExportar onClick={handleExport} disabled={!data?.total} cargando={exporting} error={errorExport}>Exportar todo</BotonExportar>}
        flush
      >
        <Tabla>
          <thead>
            <tr>
              {COLUMNAS_QR_PANTALLA.map((t) => (
                <th key={t} className={th}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={cols}>Cargando…</FilaMensaje>
            ) : filas.length === 0 ? (
              <FilaMensaje cols={cols}>Sin QRs escaneados con estos filtros</FilaMensaje>
            ) : (
              filas.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs")}>{fmtFecha(r.escaneado_at)}</td>
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs")}>{fmtHora12(r.escaneado_at)}</td>
                  <td className={cn(td, "whitespace-nowrap text-xs")}>{r.turno}</td>
                  <td className={cn(td, "whitespace-nowrap text-xs")}>{r.usuario || "—"}</td>
                  <td className={cn(td, "font-mono text-xs text-zinc-900")} title={r.codigo_qr}>{r.token}</td>
                  <td className={cn(td, "font-mono text-xs whitespace-nowrap")}>{r.sku_number}</td>
                  <td className={cn(td, "text-xs")}>{r.size}</td>
                  <td className={cn(td, "font-mono text-xs whitespace-nowrap")}>{r.codigo_caja || "—"}</td>
                  <td className={cn(td, "font-mono text-xs whitespace-nowrap")} title={r.como_se_embarco || undefined}>{r.carton_id || "—"}</td>
                  <td className={cn(td, "font-mono text-xs whitespace-nowrap")}>{r.po_number || "—"}</td>
                  <td className={td}><Estado valor={r.qr_estado} /></td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
        <Paginacion page={data?.page || 1} pages={data?.pages || 1} total={data?.total || 0} limit={100} onPage={setPage} />
      </Panel>
    </div>
  );
}

// --- Tab: QRs sin SKU ---
// Agrupados por UPC: lo que hay que resolver es cada UPC, no cada QR.
const SITUACION = {
  danado: ["UPC dañado: pedir el correcto a Trysor", "bg-red-50 text-red-700 border-red-200"],
  vincular: ["Solo falta vincular", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  ceros: ["UPC con ceros distintos", "bg-amber-50 text-amber-800 border-amber-200"],
  cargar: ["Falta cargar el SKU", "bg-zinc-100 text-zinc-700 border-zinc-200"],
};
const situacion = (r) =>
  !/^\d{12,14}$/.test(r.upc) ? "danado" : r.ya_esta_en_skus ? "vincular" : r.upc_en_skus ? "ceros" : "cargar";

function TabQRsSinSKU() {
  const { data, isLoading } = useQuery({
    queryKey: ["qrs-sin-sku-upcs"],
    queryFn: () => getQrsSinSKUPorUPC().then((r) => r.data),
  });
  const filas = data?.data || [];
  const cuenta = (k) => filas.filter((r) => situacion(r) === k).length;

  function handleExport() {
    exportToExcel(
      filas.map((r) => ({
        UPC: r.upc,
        QRs: r.qrs,
        Disponibles: r.disponibles,
        "Primer import": fmtFecha(r.primer_import),
        "Último import": fmtFecha(r.ultimo_import),
        "Qué falta": SITUACION[situacion(r)][0],
        "UPC parecido en SKUs": r.upc_en_skus || "",
      })),
      "upcs-sin-sku",
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="UPCs sin SKU" value={fmtNum(data?.total_upcs)} hint={`${fmtNum(data?.total_qrs)} QRs sin poder escanearse`} />
        <Kpi label="Falta cargar el SKU" value={fmtNum(cuenta("cargar"))} hint="Agrégalos con la plantilla de SKUs" />
        <Kpi label="UPC con ceros distintos" value={fmtNum(cuenta("ceros"))} hint="Corrige el UPC en el catálogo" tone={cuenta("ceros") ? "alerta" : "normal"} hintTone={cuenta("ceros") ? "alerta" : "neutral"} />
        <Kpi label="Solo falta vincular" value={fmtNum(cuenta("vincular"))} hint="Importar QRs › Vincular QRs huérfanos" />
      </div>

      {cuenta("danado") > 0 && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="font-semibold">
            {fmtNum(filas.filter((r) => situacion(r) === "danado").reduce((a, r) => a + r.qrs, 0))} QRs
          </span>{" "}
          tienen el UPC dañado (en notación científica, como «1.91E+11»): así llegó de Trysor y ya no se puede saber cuál
          era. No se arregla cargando SKUs. Pide a Trysor que corrija el UPC de esos códigos y vuelve a importar QRs: el
          sistema los repara solo.
        </p>
      )}

      <Panel
        title="UPCs de los QRs sin SKU"
        subtitle="Un QR sin SKU no se puede escanear en Producción («El UPC del QR no corresponde al SKU de la caja»)."
        actions={<BotonExportar onClick={handleExport} disabled={!filas.length} />}
        flush
      >
        <Tabla>
          <thead>
            <tr>
              <th className={th}>UPC</th>
              <th className={thNum}>QRs</th>
              <th className={thNum}>Disponibles</th>
              <th className={th}>Importados</th>
              <th className={th}>Qué falta</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={5}>Cargando…</FilaMensaje>
            ) : filas.length === 0 ? (
              <FilaMensaje cols={5}>Todos los QRs tienen SKU asignado</FilaMensaje>
            ) : (
              filas.map((r) => {
                const [texto, cls] = SITUACION[situacion(r)];
                return (
                  <tr key={r.upc} className="hover:bg-zinc-50">
                    <td className={tdMono}>{r.upc}</td>
                    <td className={cn(tdNum, "font-medium text-zinc-900")}>{fmtNum(r.qrs)}</td>
                    <td className={tdNum}>{fmtNum(r.disponibles)}</td>
                    <td className={cn(td, "text-xs text-zinc-500 tabular-nums whitespace-nowrap")}>
                      {r.primer_import === r.ultimo_import ? fmtFecha(r.primer_import) : `${fmtFecha(r.primer_import)} a ${fmtFecha(r.ultimo_import)}`}
                    </td>
                    <td className={td}>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap", cls)}>{texto}</span>
                      {r.upc_en_skus && (
                        <span className="ml-2 text-xs text-zinc-500">en SKUs: <span className="font-mono">{r.upc_en_skus}</span></span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Tabla>
      </Panel>
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
        "Enviado At": r.enviado_at ? new Date(r.enviado_at).toLocaleString("es-MX") : "",
        "Cancelado At": r.cancelado_at ? new Date(r.cancelado_at).toLocaleString("es-MX") : "",
        "Respuesta API": r.respuesta_success || "",
        "Error Code": r.respuesta_error_code || "",
        Mensaje: r.respuesta_mensaje || "",
        "Fecha Registro": new Date(r.created_at).toLocaleString("es-MX"),
      })),
      "historial-envios-t4",
    );
  }

  return (
    <Panel
      title={`${fmtNum(data.length)} movimientos con T4`}
      actions={<BotonExportar onClick={handleExport} disabled={!data.length} />}
      flush
    >
      <Tabla>
        <thead>
          <tr>
            <th className={th}>PO</th>
            <th className={th}>Estado</th>
            <th className={thNum}>Pares</th>
            <th className={thNum}>Cartones</th>
            <th className={thNum}>QRs</th>
            <th className={th}>Fecha</th>
            <th className={th}>Respuesta de T4</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <FilaMensaje cols={7}>Cargando…</FilaMensaje>
          ) : data.length === 0 ? (
            <FilaMensaje cols={7}>Sin envíos registrados</FilaMensaje>
          ) : (
            data.map((r) => {
              const ok = String(r.respuesta_success).toLowerCase() === "true";
              return (
                <tr key={r.id} className="align-top hover:bg-zinc-50">
                  <td className={tdMono}>
                    {r.po_number}
                    {r.cfm_xf_date && <div className="text-zinc-500 font-sans mt-0.5">XF {fmtFecha(r.cfm_xf_date)}</div>}
                  </td>
                  <td className={td}><Estado valor={r.estado} /></td>
                  <td className={tdNum}>{fmtNum(r.cantidad_pares)}</td>
                  <td className={tdNum}>{fmtNum(r.cantidad_cartones)}</td>
                  <td className={cn(tdNum, "text-zinc-900 font-medium")}>{fmtNum(r.qrs_asociados)}</td>
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs text-zinc-500")}>
                    {new Date(r.enviado_at || r.cancelado_at || r.created_at).toLocaleString("es-MX")}
                  </td>
                  <td className={cn(td, "max-w-xs text-xs")}>
                    {r.respuesta_success && (
                      <span className={ok ? "text-emerald-700 font-medium" : "text-red-700 font-medium"}>
                        {ok ? "Aceptado" : "Rechazado"}
                      </span>
                    )}
                    {r.respuesta_error_code && <div className="text-red-700 font-mono">{r.respuesta_error_code}</div>}
                    {r.respuesta_mensaje && <div className="text-zinc-500 truncate" title={r.respuesta_mensaje}>{r.respuesta_mensaje}</div>}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Tabla>
    </Panel>
  );
}

// --- Tab: Liberaciones de caja ---
function TabLiberaciones() {
  const [filters, setFilters] = useState({ fecha_desde: "", fecha_hasta: "" });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [errorExport, setErrorExport] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["liberaciones", filters, page],
    queryFn: () => getLiberaciones({ ...filters, page, limit: 50 }).then((r) => r.data),
    placeholderData: conservar,
  });

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    setErrorExport("");
    try {
      const res = await getLiberaciones({ ...filters, all: 1 });
      exportToExcel(
        (res.data.data || []).map((r) => ({
          "Fecha y hora": fmtFechaHora(r.fecha_hora),
          "Código Caja": r.codigo_caja,
          SKU: r.sku_number || "",
          "Pares escaneados": r.pares_escaneados,
          "Pares de la caja": r.cantidad_pares,
          Motivo: r.motivo_texto,
          Comentario: r.comentario || "",
          Supervisor: r.supervisor,
          "Sesión": r.liberado_por || "",
          "Estado actual de la caja": r.caja_estado || "",
        })),
        "liberaciones-de-caja",
      );
    } catch (e) {
      setErrorExport(await mensajeDeError(e));
    } finally {
      setExporting(false);
    }
  }

  const filas = data?.data || [];
  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-5">
          <Campo label="Desde">
            <input type="date" value={filters.fecha_desde} onChange={(e) => set("fecha_desde", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={filters.fecha_hasta} onChange={(e) => set("fecha_hasta", e.target.value)} className={inputCls} />
          </Campo>
        </div>
      </Panel>
      <Panel
        title={`${fmtNum(data?.total)} cajas liberadas por un supervisor`}
        subtitle="Cajas que se dejaron incompletas con el bloqueo activo. Siguen abiertas hasta completarlas o resetearlas."
        actions={<BotonExportar onClick={handleExport} disabled={!data?.total} cargando={exporting} error={errorExport} />}
        flush
      >
        <Tabla>
          <thead>
            <tr>
              <th className={th}>Fecha y hora</th>
              <th className={th}>Caja</th>
              <th className={thNum}>Pares</th>
              <th className={th}>Motivo</th>
              <th className={th}>Supervisor</th>
              <th className={th}>Caja hoy</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={6}>Cargando…</FilaMensaje>
            ) : filas.length === 0 ? (
              <FilaMensaje cols={6}>No hay liberaciones en este periodo</FilaMensaje>
            ) : (
              filas.map((r) => (
                <tr key={r.id} className="align-top hover:bg-zinc-50">
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs text-zinc-500")}>{fmtFechaHora(r.fecha_hora)}</td>
                  <td className={cn(td, "font-mono text-xs")}>
                    <div className="text-zinc-900">{r.codigo_caja}</div>
                    <div className="text-zinc-500">{r.sku_number}</div>
                  </td>
                  <td className={cn(tdNum, "text-amber-700 font-medium")}>{r.pares_escaneados}/{r.cantidad_pares}</td>
                  <td className={td}>
                    <div className="text-zinc-900">{r.motivo_texto}</div>
                    {r.comentario && <div className="text-xs text-zinc-500 mt-0.5 max-w-sm">{r.comentario}</div>}
                  </td>
                  <td className={cn(td, "text-zinc-900")}>{r.supervisor}</td>
                  <td className={td}>{r.caja_estado ? <Estado valor={r.caja_estado} /> : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
        <Paginacion page={data?.page || 1} pages={data?.pages || 1} total={data?.total || 0} limit={50} onPage={setPage} />
      </Panel>
    </div>
  );
}

// --- Tab: Reseteos ---
// Todo reset queda registrado: qué se reseteó, por qué, quién lo hizo y, si no
// fue un superadmin, qué supervisor lo autorizó con su gafete.
const TIPOS_RESET = {
  caja: "Reset de caja",
  carton: "Reset de cartón",
  po: "Reset de PO",
  desasociar_caja: "Desasociar caja",
};

// Lo que hizo el reset, en una línea (sale del resultado guardado).
function resumenReset(r) {
  const x = r.resultado || {};
  if (r.tipo === "caja") return `${fmtNum(x.escaneos_borrados)} escaneos borrados`;
  if (r.tipo === "carton") return `${fmtNum(x.escaneos_musicales_borrados)} pares quitados · ${fmtNum(x.cajas_desligadas)} cajas desligadas`;
  if (r.tipo === "po") return `${fmtNum(x.cartones_reseteados)} cartones · ${fmtNum(x.cajas_desligadas)} cajas · ${fmtNum((x.escaneos_cajas_borrados || 0) + (x.escaneos_musicales_borrados || 0))} escaneos`;
  if (r.tipo === "desasociar_caja") return `${x.cartones_afectados} cartones · PO ${x.pos}`;
  return "";
}

function TabReseteos() {
  const [filters, setFilters] = useState({ fecha_desde: "", fecha_hasta: "", tipo: "" });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [errorExport, setErrorExport] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reseteos", filters, page],
    queryFn: () => getReseteos({ ...filters, page, limit: 50 }).then((r) => r.data),
    placeholderData: conservar,
  });

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    setErrorExport("");
    try {
      const res = await getReseteos({ ...filters, all: 1 });
      exportToExcel(
        (res.data.data || []).map((r) => ({
          "Fecha y hora": fmtFechaHora(r.fecha_hora),
          Tipo: r.tipo_texto,
          Código: r.codigo,
          Motivo: r.motivo_texto,
          Comentario: r.comentario || "",
          "Autorizó (supervisor)": r.supervisor || "",
          "Hecho por": r.hecho_por || "",
          Resultado: resumenReset(r),
        })),
        "reseteos",
      );
    } catch (e) {
      setErrorExport(await mensajeDeError(e));
    } finally {
      setExporting(false);
    }
  }

  const filas = data?.data || [];
  return (
    <div className="space-y-4">
      <Panel>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-5">
          <Campo label="Desde">
            <input type="date" value={filters.fecha_desde} onChange={(e) => set("fecha_desde", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Hasta">
            <input type="date" value={filters.fecha_hasta} onChange={(e) => set("fecha_hasta", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Tipo">
            <select value={filters.tipo} onChange={(e) => set("tipo", e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              {Object.entries(TIPOS_RESET).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Campo>
        </div>
      </Panel>
      <Panel
        title={`${fmtNum(data?.total)} ${data?.total === 1 ? "reseteo" : "reseteos"}`}
        subtitle="Cada reset con su motivo. Los que no hizo un superadmin llevan el supervisor que los autorizó con su gafete."
        actions={<BotonExportar onClick={handleExport} disabled={!data?.total} cargando={exporting} error={errorExport} />}
        flush
      >
        <Tabla>
          <thead>
            <tr>
              <th className={th}>Fecha y hora</th>
              <th className={th}>Qué se reseteó</th>
              <th className={th}>Motivo</th>
              <th className={th}>Autorizó</th>
              <th className={th}>Hecho por</th>
              <th className={th}>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <FilaMensaje cols={6}>Cargando…</FilaMensaje>
            ) : filas.length === 0 ? (
              <FilaMensaje cols={6}>No hay reseteos en este periodo</FilaMensaje>
            ) : (
              filas.map((r) => (
                <tr key={r.id} className="align-top hover:bg-zinc-50">
                  <td className={cn(td, "whitespace-nowrap tabular-nums text-xs text-zinc-500")}>{fmtFechaHora(r.fecha_hora)}</td>
                  <td className={td}>
                    <div className="text-zinc-900 text-xs font-medium">{r.tipo_texto}</div>
                    <div className="font-mono text-xs text-zinc-500 break-all">{r.codigo}</div>
                  </td>
                  <td className={td}>
                    <div className="text-zinc-900">{r.motivo_texto}</div>
                    {r.comentario && <div className="text-xs text-zinc-500 mt-0.5 max-w-sm">{r.comentario}</div>}
                  </td>
                  <td className={cn(td, "text-zinc-900")}>{r.supervisor || <span className="text-zinc-400">—</span>}</td>
                  <td className={cn(td, "text-zinc-900 whitespace-nowrap")}>{r.hecho_por}</td>
                  <td className={cn(td, "text-xs text-zinc-500")}>{resumenReset(r)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
        <Paginacion page={data?.page || 1} pages={data?.pages || 1} total={data?.total || 0} limit={50} onPage={setPage} />
      </Panel>
    </div>
  );
}

// --- Página principal ---
const TAB_CONTENT = {
  produccion: TabProduccion,
  trazabilidad: TabTrazabilidad,
  cajas: TabCajas,
  pendientes: TabPendientes,
  "detalle-po": TabDetallePO,
  "detalle-cajas": TabDetalleCajas,
  "detalle-qrs": TabDetalleQRs,
  "sin-sku": TabQRsSinSKU,
  envios: TabEnviosT4,
  liberaciones: TabLiberaciones,
  reseteos: TabReseteos,
};

export default function ReportesPage() {
  // La pestaña va en la URL (?tab=) para poder enlazarla desde el Dashboard.
  const [params, setParams] = useSearchParams();
  const activeTab = TAB_CONTENT[params.get("tab")] ? params.get("tab") : "produccion";
  const Contenido = TAB_CONTENT[activeTab];

  return (
    <div className="p-8 max-w-[1400px]">
      <PageTitle title="Reportes" description="Producción, embarque y trazabilidad de códigos" />

      {/* El borde inferior va como sombra interna: un border-b con -mb-px en las
          pestañas desborda 1 px y hace aparecer una barra de scroll vertical. */}
      <nav className="flex items-center mb-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shadow-[inset_0_-1px_0_#e4e4e7]">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setParams({ tab: id })}
            className={cn(
              "px-2.5 py-2.5 text-sm whitespace-nowrap border-b-2",
              activeTab === id
                ? "border-blue-600 text-zinc-900 font-medium"
                : "border-transparent text-zinc-500 hover:text-zinc-900",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <Contenido key={activeTab} />
    </div>
  );
}
