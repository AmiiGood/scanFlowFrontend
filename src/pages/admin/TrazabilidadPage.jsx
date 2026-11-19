// Trazabilidad: se escanea un QR (o la etiqueta de una caja) y se ve todo su
// recorrido, de Trysor a la PO enviada. Cada código que aparece en pantalla se
// puede abrir, así que se navega de un par a su caja, de la caja a otro par…
// El código buscado va en la URL (?codigo=) para que Atrás funcione y para
// poder enlazarlo desde los reportes.
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Box,
  Check,
  Copy,
  History,
  Loader2,
  MapPin,
  PackageOpen,
  QrCode,
  ScanLine,
  Send,
  Truck,
  X,
} from "lucide-react";
import { getTrazabilidadQR } from "@/api/reports";
import { BarraAvance, Estado, PageTitle, Panel } from "@/components/reportes/kit";
import { useAuthStore } from "@/store/authStore";
import { puede } from "@/lib/permisos";
import { cn } from "@/lib/utils";
import { fmtFecha, fmtFechaHora, fmtNum } from "@/lib/formato";

const CLAVE_RECIENTES = "scanflow.trazabilidad.recientes";
const MAX_RECIENTES = 8;

// --- Utilidades --------------------------------------------------------------

// Lo que manda el escáner con el teclado en español ("httpsÑ--scan.crocs.com-Q-…")
// lo arregla el servidor; aquí solo se quitan espacios y saltos de línea.
const limpiar = (v) => String(v || "").replace(/[\r\n]+/g, "").trim();
const pares = (n) => `${fmtNum(n)} ${Number(n) === 1 ? "par" : "pares"}`;

function leerRecientes() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function guardarReciente(item) {
  const lista = [item, ...leerRecientes().filter((r) => r.codigo !== item.codigo)].slice(0, MAX_RECIENTES);
  try {
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
  } catch {
    // sin almacenamiento: solo no se recuerda
  }
  return lista;
}

// El servidor corre en http, donde navigator.clipboard no existe.
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function BotonCopiar({ texto, className }) {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      title="Copiar"
      onClick={async () => {
        if (await copiar(texto)) {
          setHecho(true);
          setTimeout(() => setHecho(false), 1200);
        }
      }}
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100",
        className,
      )}
    >
      {hecho ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
    </button>
  );
}

// Un código que se puede abrir en esta misma pantalla.
function Abrir({ codigo, children, className }) {
  const [, setParams] = useSearchParams();
  if (!codigo) return children || "—";
  return (
    <button
      type="button"
      onClick={() => setParams({ codigo })}
      className={cn(
        "font-mono text-left break-all text-blue-700 hover:text-blue-900 hover:underline underline-offset-2",
        className,
      )}
    >
      {children || codigo}
    </button>
  );
}

// --- Búsqueda ----------------------------------------------------------------

// Se vuelve a montar con cada código (key): el texto queda seleccionado y el
// siguiente escaneo lo reemplaza sin tener que borrar.
function Buscador({ codigo, buscando, recientes, onBuscar, onQuitarReciente }) {
  const [valor, setValor] = useState(codigo);
  const input = useRef(null);
  useEffect(() => input.current?.select(), []);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onBuscar(valor);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1 min-w-0">
          <ScanLine size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            ref={input}
            value={valor}
            onChange={(e) => {
              const v = e.target.value;
              // El escáner termina con Enter; algunos mandan \r o \n pegado.
              if (/[\r\n]$/.test(v)) onBuscar(v);
              else setValor(v);
            }}
            onPaste={(e) => {
              e.preventDefault();
              onBuscar(e.clipboardData.getData("text"));
            }}
            placeholder="Escanea o pega un QR, solo el código, o la etiqueta de una caja"
            className="h-14 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-12 pr-10 font-mono text-sm text-zinc-900 placeholder:font-sans placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/15 focus:border-blue-600"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          {buscando && (
            <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
          )}
        </div>
        <button
          type="submit"
          className="h-14 px-6 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shrink-0"
        >
          Buscar
        </button>
      </form>

      {recientes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          <History size={13} className="text-zinc-400 mr-1" />
          {recientes.map((r) => (
            <span
              key={r.codigo}
              className={cn(
                "group inline-flex items-center rounded-full border text-xs",
                r.codigo === codigo ? "border-blue-200 bg-blue-50" : "border-zinc-200 bg-white hover:border-zinc-300",
              )}
            >
              <button
                type="button"
                onClick={() => onBuscar(r.codigo)}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1"
                title={r.codigo}
              >
                {r.tipo === "caja" ? (
                  <Box size={12} className="text-zinc-400" />
                ) : (
                  <QrCode size={12} className="text-zinc-400" />
                )}
                <span className="font-mono text-zinc-800 max-w-44 truncate">{r.etiqueta}</span>
              </button>
              <button
                type="button"
                onClick={() => onQuitarReciente(r.codigo)}
                className="p-1 pr-2 text-zinc-300 hover:text-zinc-700"
                aria-label="Quitar"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// --- El recorrido (pasos de arriba) -------------------------------------------

function pasosDe(d) {
  const ev = (tipo) => d.eventos.filter((e) => e.tipo === tipo);
  const produccion = ev("produccion")[0];
  const embarque = ev("embarque")[0];
  const movimientos = ev("consolidacion");
  const envio = ev("envio").filter((e) => e.estado === "enviado").at(-1);
  const enviado = d.qr.estado === "enviado" || !!envio;

  const pasos = [
    {
      id: "trysor",
      icono: QrCode,
      titulo: "Trysor",
      hecho: true,
      valor: "Importado",
      fecha: d.qr.importado_at,
    },
    {
      id: "produccion",
      icono: PackageOpen,
      titulo: "Producción",
      hecho: !!produccion,
      valor: produccion ? produccion.caja : "Sin escanear",
      fecha: produccion?.fecha_hora,
      ancla: "caja",
    },
  ];
  if (movimientos.length)
    pasos.push({
      id: "almacen",
      icono: ArrowLeftRight,
      titulo: "Consolidado",
      hecho: true,
      valor: movimientos.at(-1).destino,
      fecha: movimientos.at(-1).fecha_hora,
      ancla: "caja",
    });
  pasos.push(
    {
      id: "embarque",
      icono: Truck,
      titulo: "Embarque",
      hecho: !!d.carton,
      valor: d.carton ? `${d.carton.carton_id} · PO ${d.po?.po_number || "—"}` : "Sin cartón",
      fecha: embarque?.fecha_hora,
      nota: d.carton && !embarque ? "entró con su caja" : null,
      ancla: "embarque",
    },
    {
      id: "envio",
      icono: Send,
      titulo: "Enviado",
      hecho: enviado,
      valor: enviado ? "A Trysor" : "Pendiente",
      fecha: envio?.fecha_hora,
      ancla: "embarque",
    },
  );
  // El paso donde está ahora: el último que ya se cumplió.
  const actual = pasos.map((p) => p.hecho).lastIndexOf(true);
  return pasos.map((p, i) => ({ ...p, actual: i === actual }));
}

function Recorrido({ pasos, onIr }) {
  return (
    <ol className="flex overflow-x-auto pb-1 -mx-1">
      {pasos.map((p, i) => {
        const Icono = p.icono;
        const siguienteHecho = pasos[i + 1]?.hecho;
        return (
          <li key={p.id} className="relative flex-1 min-w-28 px-1">
            {/* Línea hacia el siguiente paso */}
            {i < pasos.length - 1 && (
              <span
                className={cn(
                  "absolute top-5 left-[calc(50%+22px)] right-[calc(-50%+22px)] h-0.5 rounded-full",
                  siguienteHecho ? "bg-blue-600" : "bg-zinc-200",
                )}
              />
            )}
            <button
              type="button"
              disabled={!p.ancla}
              onClick={() => p.ancla && onIr(p.ancla)}
              className="group w-full flex flex-col items-center text-center disabled:cursor-default"
            >
              <span className="relative">
                {p.actual && <span className="absolute inset-0 rounded-full bg-blue-600/30 animate-ping" />}
                <span
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-transform",
                    p.ancla && "group-hover:scale-110",
                    p.hecho
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-zinc-200 border-dashed text-zinc-300",
                    p.actual && "ring-4 ring-blue-100",
                  )}
                >
                  <Icono size={17} />
                </span>
              </span>
              <span className={cn("mt-2 text-xs font-semibold", p.hecho ? "text-zinc-900" : "text-zinc-400")}>
                {p.titulo}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[11px] break-all max-w-full",
                  p.hecho ? "text-zinc-600 font-mono" : "text-zinc-400",
                )}
              >
                {p.valor}
              </span>
              {p.fecha && <span className="text-[11px] text-zinc-400 tabular-nums">{fmtFechaHora(p.fecha)}</span>}
              {p.nota && <span className="text-[11px] text-zinc-400">{p.nota}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// --- La caja vista desde arriba -------------------------------------------------

function VistaCaja({ caja, actual }) {
  const [, setParams] = useSearchParams();
  const [sobre, setSobre] = useState(null);
  const enCarton = !!caja.carton_pk;
  const huecos = Math.max(0, caja.cantidad_pares - caja.pares.length);
  const columnas = Math.max(caja.cantidad_pares, caja.pares.length) > 12 ? 8 : 6;
  const detalle = sobre ?? caja.pares.find((p) => p.codigo_qr === actual) ?? null;

  return (
    <div>
      <div
        className="grid gap-1.5 p-3 rounded-xl bg-zinc-100/70 border border-zinc-200 w-fit max-w-full"
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 3.75rem))` }}
      >
        {caja.pares.map((p, i) => {
          const esEste = p.codigo_qr === actual;
          const sacado = !!p.carton_suelto;
          return (
            <button
              key={p.codigo_qr}
              type="button"
              onMouseEnter={() => setSobre(p)}
              onMouseLeave={() => setSobre(null)}
              onFocus={() => setSobre(p)}
              onBlur={() => setSobre(null)}
              onClick={() => !esEste && setParams({ codigo: p.codigo_qr })}
              title={p.token}
              className={cn(
                "relative aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-mono transition-all",
                "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600",
                esEste
                  ? "bg-blue-600 text-white ring-4 ring-blue-200 z-10"
                  : sacado
                    ? "bg-white text-amber-700 border-2 border-dashed border-amber-300"
                    : enCarton
                      ? "bg-violet-100 text-violet-800 border border-violet-200"
                      : "bg-white text-zinc-700 border border-zinc-200",
              )}
            >
              {p.llego_de && (
                <ArrowLeftRight size={10} className={cn("absolute top-1 right-1", esEste ? "text-blue-100" : "text-amber-500")} />
              )}
              <span className="opacity-60">{i + 1}</span>
              <span className="font-semibold">{p.token.slice(-4)}</span>
            </button>
          );
        })}
        {Array.from({ length: huecos }, (_, i) => (
          <span key={`h${i}`} className="aspect-square rounded-lg border border-dashed border-zinc-300" />
        ))}
      </div>

      {/* Leyenda o detalle del par señalado */}
      <div className="min-h-12 mt-3">
        {detalle ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-mono text-sm text-zinc-900">{detalle.token}</span>
            <Estado valor={detalle.estado} />
            <span className="text-zinc-500 tabular-nums">escaneado {fmtFechaHora(detalle.fecha_hora)}</span>
            {detalle.llego_de && (
              <span className="text-zinc-500">
                llegó de <Abrir codigo={detalle.llego_de} className="text-xs" />
              </span>
            )}
            {detalle.carton_suelto && (
              <span className="text-amber-700">se empacó suelto en el cartón {detalle.carton_suelto}</span>
            )}
            {detalle.codigo_qr !== actual && <span className="text-blue-700">clic para abrirlo</span>}
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <Muestra cls="bg-blue-600" texto="este par" />
            <Muestra cls={enCarton ? "bg-violet-100 border border-violet-200" : "bg-white border border-zinc-300"} texto={enCarton ? "en el cartón con la caja" : "en la caja"} />
            <Muestra cls="bg-white border-2 border-dashed border-amber-300" texto="se sacó a un cartón" />
            {caja.pares.some((p) => p.llego_de) && (
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeftRight size={11} className="text-amber-500" /> llegó de otra caja
              </span>
            )}
            {huecos > 0 && <Muestra cls="border border-dashed border-zinc-300" texto="lugar vacío" />}
          </div>
        )}
      </div>
    </div>
  );
}

function Muestra({ cls, texto }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-3 h-3 rounded", cls)} />
      {texto}
    </span>
  );
}

function PanelCaja({ caja, actual, resaltar }) {
  const mensaje = caja.carton_pk
    ? "Entró completa a un cartón"
    : caja.en_caja === 0
      ? "Ya no le quedan pares: todos se empacaron sueltos"
      : `Le quedan ${pares(caja.en_caja)} de ${fmtNum(caja.cantidad_pares)}`;
  return (
    <section
      id="traza-caja"
      className={cn(
        "bg-white rounded-xl border border-zinc-200 transition-shadow duration-500",
        resaltar && "ring-4 ring-blue-200",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Box size={13} /> Caja
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Abrir codigo={caja.codigo_caja} className="text-sm font-semibold" />
            <BotonCopiar texto={caja.codigo_caja} />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {caja.sku_number} · talla {caja.size} · {mensaje}
          </p>
        </div>
        <Estado valor={caja.estado} />
      </header>
      <div className="px-5 pb-5">
        <VistaCaja caja={caja} actual={actual} />
        <p className="text-[11px] text-zinc-400 mt-1">
          La abrió {caja.creada_por || "—"} el {fmtFechaHora(caja.creada_at)} · {pares(caja.escaneados)} en ella
          {caja.salieron > 0 && ` · ${pares(caja.salieron)} se movieron a otra caja`}
        </p>
      </div>
    </section>
  );
}

function PanelEmbarque({ carton, po, resaltar }) {
  const user = useAuthStore((s) => s.user);
  return (
    <section
      id="traza-embarque"
      className={cn(
        "bg-white rounded-xl border border-zinc-200 transition-shadow duration-500",
        resaltar && "ring-4 ring-blue-200",
      )}
    >
      <header className="px-5 pt-4 pb-3">
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Truck size={13} /> Embarque
        </p>
      </header>
      <div className="px-5 pb-5 space-y-5">
        {carton && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-sm font-semibold text-zinc-900 break-all">{carton.carton_id}</span>
                <Estado valor={carton.tipo} />
              </div>
              <Estado valor={carton.estado} />
            </div>
            <BarraAvance valor={carton.pares} total={carton.esperados} className="mt-2.5" />
            <p className="text-xs text-zinc-500 mt-1.5 tabular-nums">
              {fmtNum(carton.pares)} de {pares(carton.esperados)}
              {carton.cajas > 0 && ` · ${fmtNum(carton.cajas)} ${carton.cajas === 1 ? "caja completa" : "cajas completas"}`}
            </p>
          </div>
        )}
        {po && (
          <div className="pt-4 border-t border-zinc-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Purchase order</p>
                {puede(user, "pos.ver") ? (
                  <Link
                    to={`/admin/purchase-orders/${po.id}`}
                    className="font-mono text-sm font-semibold text-blue-700 hover:underline underline-offset-2"
                  >
                    {po.po_number}
                  </Link>
                ) : (
                  <span className="font-mono text-sm font-semibold text-zinc-900">{po.po_number}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {po.cfm_xf_date && <span className="text-xs text-zinc-500">XF {fmtFecha(po.cfm_xf_date)}</span>}
                <Estado valor={po.estado} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Avance etiqueta="Cartones completos" valor={po.cartones_completos} total={po.cartones} />
              <Avance etiqueta="Pares" valor={po.pares_escaneados} total={po.cantidad_pares} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Avance({ etiqueta, valor, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-zinc-500">{etiqueta}</span>
        <span className="text-xs font-medium text-zinc-900 tabular-nums">{pct}%</span>
      </div>
      <BarraAvance valor={valor} total={total} className="mt-1.5" />
      <p className="text-[11px] text-zinc-400 mt-1 tabular-nums">
        {fmtNum(valor)} / {fmtNum(total)}
      </p>
    </div>
  );
}

// --- Línea de tiempo ------------------------------------------------------------

const EVENTO = {
  importado: { icono: QrCode, color: "bg-zinc-900 text-white" },
  produccion: { icono: PackageOpen, color: "bg-blue-600 text-white" },
  consolidacion: { icono: ArrowLeftRight, color: "bg-amber-500 text-white" },
  embarque: { icono: Truck, color: "bg-violet-600 text-white" },
  envio: { icono: Send, color: "bg-emerald-600 text-white" },
};

function textoEvento(e) {
  switch (e.tipo) {
    case "importado":
      return { titulo: "Se importó de Trysor" };
    case "produccion":
      return { titulo: "Escaneado en Producción", codigo: e.caja, prefijo: "en la caja" };
    case "consolidacion":
      return { titulo: "Se movió de caja (consolidación)", desde: e.origen, codigo: e.destino };
    case "embarque":
      return { titulo: "Empacado suelto en Embarque", texto: `cartón ${e.carton}${e.po ? ` · PO ${e.po}` : ""}` };
    case "envio":
      return {
        titulo: e.estado === "enviado" ? "La PO se envió a Trysor" : `Envío de la PO: ${e.estado}`,
        texto: e.po ? `PO ${e.po}` : null,
      };
    default:
      return { titulo: e.tipo };
  }
}

function LineaDeTiempo({ eventos }) {
  return (
    <ol className="relative">
      {eventos.map((e, i) => {
        const { icono: Icono, color } = EVENTO[e.tipo] || EVENTO.importado;
        const t = textoEvento(e);
        const ultimo = i === eventos.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {!ultimo && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-zinc-200" />}
            <span className={cn("relative z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0", color)}>
              <Icono size={13} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-zinc-900">{t.titulo}</p>
              {t.desde && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  de <Abrir codigo={t.desde} className="text-xs" />
                </p>
              )}
              {t.codigo && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t.prefijo || "a"} <Abrir codigo={t.codigo} className="text-xs" />
                </p>
              )}
              {t.texto && <p className="text-xs text-zinc-500 mt-0.5 font-mono break-all">{t.texto}</p>}
              <p className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
                {fmtFechaHora(e.fecha_hora)}
                {e.usuario && ` · ${e.usuario}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// --- Resultados ---------------------------------------------------------------

function dondeEsta(d) {
  if (d.qr.estado === "disponible") return "Todavía no se escanea en Producción";
  if (d.qr.estado === "enviado") return `Enviado a Trysor en la PO ${d.po?.po_number || "—"}`;
  if (d.carton) return `En el cartón ${d.carton.carton_id}${d.po ? ` de la PO ${d.po.po_number}` : ""}`;
  if (d.caja) return `En la caja ${d.caja.codigo_caja}`;
  return "Escaneado, sin caja ni cartón";
}

function useResaltar() {
  const [cual, setCual] = useState(null);
  function ir(ancla) {
    document.getElementById(`traza-${ancla}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setCual(ancla);
    setTimeout(() => setCual(null), 1400);
  }
  return [cual, ir];
}

function ResultadoQR({ d }) {
  const [resaltado, ir] = useResaltar();
  const { qr } = d;
  const pasos = pasosDe(d);
  return (
    <div className="space-y-4">
      {/* El par */}
      <section className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-semibold tracking-wide text-zinc-900">{qr.token}</span>
              <BotonCopiar texto={qr.codigo_qr} />
              <Estado valor={qr.estado} />
            </div>
            <p className="font-mono text-xs text-zinc-400 mt-0.5 break-all">{qr.codigo_qr}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-900 max-w-full">
            <MapPin size={15} className="shrink-0 text-blue-600" />
            <span className="break-all">{dondeEsta(d)}</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 mt-5 pt-4 border-t border-zinc-100">
          <Dato label="SKU" mono>{qr.sku_number}</Dato>
          <Dato label="Producto">{qr.style_name}</Dato>
          <Dato label="Talla">{qr.size}</Dato>
          <Dato label="Color">{[qr.color, qr.color_name].filter(Boolean).join(" · ")}</Dato>
          <Dato label="Style No" mono>{qr.style_no}</Dato>
          <Dato label="UPC" mono>{qr.upc}</Dato>
        </dl>
      </section>

      {/* Recorrido */}
      <Panel title="Recorrido" subtitle="Toca un paso para ver su detalle">
        <Recorrido pasos={pasos} onIr={ir} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
        <div className="xl:col-span-3 space-y-4">
          {d.caja ? (
            <PanelCaja caja={d.caja} actual={qr.codigo_qr} resaltar={resaltado === "caja"} />
          ) : (
            <Vacio id="traza-caja" icono={PackageOpen} resaltar={resaltado === "caja"}>
              Este par todavía no entra a ninguna caja.
            </Vacio>
          )}
          {d.carton ? (
            <PanelEmbarque carton={d.carton} po={d.po} resaltar={resaltado === "embarque"} />
          ) : (
            <Vacio id="traza-embarque" icono={Truck} resaltar={resaltado === "embarque"}>
              Todavía no está en ningún cartón.
            </Vacio>
          )}
        </div>
        <Panel className="xl:col-span-2" title="Historial" subtitle={`${d.eventos.length} movimientos`}>
          <LineaDeTiempo eventos={d.eventos} />
        </Panel>
      </div>
    </div>
  );
}

function ResultadoCaja({ d }) {
  const { caja } = d;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
      <div className="xl:col-span-3">
        <PanelCaja caja={caja} actual={null} />
      </div>
      <div className="xl:col-span-2 space-y-4">
        <Panel title="Pares de la caja" subtitle="Toca uno para ver su recorrido" flush>
          <ul className="max-h-96 overflow-y-auto divide-y divide-zinc-100 border-t border-zinc-100">
            {caja.pares.map((p, i) => (
              <li key={p.codigo_qr} className="flex items-center gap-3 px-5 py-2">
                <span className="text-[11px] text-zinc-400 w-5 tabular-nums">{i + 1}</span>
                <Abrir codigo={p.codigo_qr} className="text-xs flex-1">
                  {p.token}
                </Abrir>
                {p.carton_suelto ? (
                  <span className="text-[11px] text-amber-700 font-mono">→ {p.carton_suelto}</span>
                ) : (
                  <Estado valor={p.estado} />
                )}
              </li>
            ))}
            {!caja.pares.length && <li className="px-5 py-6 text-sm text-zinc-500">La caja no tiene pares escaneados.</li>}
          </ul>
        </Panel>
        {d.carton && <PanelEmbarque carton={d.carton} po={d.po} />}
      </div>
    </div>
  );
}

function Vacio({ id, icono, children, resaltar }) {
  const Icono = icono;
  return (
    <section
      id={id}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-5 py-6 text-sm text-zinc-500 transition-shadow duration-500",
        resaltar && "ring-4 ring-blue-200",
      )}
    >
      <Icono size={18} className="text-zinc-300" />
      {children}
    </section>
  );
}

function Dato({ label, children, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className={cn("text-sm text-zinc-900 mt-0.5 break-words", mono && "font-mono text-xs")}>{children || "—"}</dd>
    </div>
  );
}

function Bienvenida() {
  const pasos = [
    { icono: QrCode, texto: "Un QR de par: su caja, su cartón, su PO y cada movimiento" },
    { icono: Box, texto: "La etiqueta de una caja: qué pares tiene y cuáles se sacaron" },
    { icono: ArrowLeftRight, texto: "Cada código que aparece se puede abrir para seguir el rastro" },
  ];
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10">
      <div className="max-w-xl mx-auto text-center">
        <ScanLine size={30} className="mx-auto text-zinc-300" />
        <p className="text-sm font-medium text-zinc-900 mt-3">Escanea un código para empezar</p>
        <ul className="mt-5 space-y-2.5 text-left">
          {pasos.map(({ icono, texto }) => {
            const Icono = icono;
            return (
            <li key={texto} className="flex items-center gap-3 text-sm text-zinc-600">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 shrink-0">
                <Icono size={14} className="text-zinc-500" />
              </span>
              {texto}
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// --- Página -------------------------------------------------------------------

export default function TrazabilidadPage() {
  const [params, setParams] = useSearchParams();
  const codigo = params.get("codigo") || "";
  const [recientes, setRecientes] = useState(leerRecientes);

  // Al abrir otro código se regresa arriba, a su recorrido.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [codigo]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["trazabilidad", codigo],
    queryFn: async () => {
      const { data: d } = await getTrazabilidadQR(codigo);
      // Recuerda lo que se encontró, con su nombre corto, para volver rápido.
      setRecientes(guardarReciente(d.tipo === "caja"
        ? { codigo: d.caja.codigo_caja, etiqueta: d.caja.codigo_caja, tipo: "caja" }
        : { codigo: d.qr.codigo_qr, etiqueta: d.qr.token, tipo: "qr" }));
      return d;
    },
    enabled: !!codigo,
    retry: false,
    placeholderData: (prev) => prev,
    staleTime: 15 * 1000,
  });


  function buscar(v) {
    const limpio = limpiar(v);
    if (limpio) setParams({ codigo: limpio });
  }

  function quitarReciente(c) {
    const lista = leerRecientes().filter((r) => r.codigo !== c);
    try {
      localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista));
    } catch {
      // nada
    }
    setRecientes(lista);
  }

  return (
    <div className="p-8 max-w-[1400px] space-y-4">
      <PageTitle
        title="Trazabilidad"
        description="Dónde está un par, por dónde pasó y con quién viaja"
        actions={
          codigo && (
            <button
              type="button"
              onClick={() => setParams({})}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <X size={14} /> Limpiar
            </button>
          )
        }
      />

      <Buscador
        key={codigo}
        codigo={codigo}
        buscando={isFetching}
        recientes={recientes}
        onBuscar={buscar}
        onQuitarReciente={quitarReciente}
      />

      {!codigo && <Bienvenida />}

      {codigo && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <X size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error.response?.data?.error || "No se pudo buscar"}</p>
            <p className="text-xs text-red-700 mt-0.5 font-mono break-all">{codigo}</p>
          </div>
        </div>
      )}

      {codigo && !error && data && (
        <div className={cn("transition-opacity", isFetching && "opacity-60")}>
          {data.tipo === "caja" ? <ResultadoCaja d={data} /> : <ResultadoQR d={data} />}
        </div>
      )}
    </div>
  );
}
