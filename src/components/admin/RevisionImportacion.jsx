// Revisión de un archivo antes de cargarlo (SKUs y POs). El backend devuelve
// qué pasaría con cada fila; aquí se muestra y se confirma la carga.
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Download, Loader2, XCircle } from "lucide-react";
import { descargarPlantillaSkus } from "@/lib/exportExcel";

const n = (v) => Number(v || 0).toLocaleString("es-MX");
// "1 SKU" / "3 SKUs"
const pl = (v, uno, varios) => `${n(v)} ${Number(v) === 1 ? uno : varios}`;

const TONO = {
  verde: "bg-emerald-50 text-emerald-700 border-emerald-200",
  azul: "bg-blue-50 text-blue-700 border-blue-200",
  gris: "bg-zinc-100 text-zinc-600 border-zinc-200",
  ambar: "bg-amber-50 text-amber-700 border-amber-200",
  rojo: "bg-red-50 text-red-700 border-red-200",
};

function Chip({ tono, children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${TONO[tono]}`}>
      {children}
    </span>
  );
}

function Marco({ titulo, archivo, cargado, resumen, children, acciones }) {
  return (
    <div className="mb-6 rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-zinc-200">
        <div>
          <p className="text-zinc-900 font-semibold flex items-center gap-2">
            {cargado ? <CheckCircle2 size={16} className="text-emerald-700" /> : null}
            {titulo}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{archivo}</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">{resumen}</div>
        </div>
        <div className="flex items-center gap-2">{acciones}</div>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Boton({ onClick, disabled, principal, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:pointer-events-none ${
        principal ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function Aviso({ tono = "rojo", children }) {
  const cls = tono === "rojo" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900";
  const Icono = tono === "rojo" ? XCircle : AlertTriangle;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs flex gap-2 ${cls}`}>
      <Icono size={14} className="shrink-0 mt-px" />
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

const thCls = "text-left px-3 py-2 text-xs text-zinc-500 font-medium border-b border-zinc-200 whitespace-nowrap";
const tdCls = "px-3 py-2 text-xs border-b border-zinc-200 align-top";

// ---------------------------------------------------------------- SKUs
const ESTADO_SKU = {
  nuevo: ["Nuevo", "verde"],
  actualiza: ["Actualiza", "azul"],
  sin_cambios: ["Sin cambios", "gris"],
  error: ["Error", "rojo"],
};
const CAMPO = { upc: "UPC", style_no: "StyleNo", style_name: "StyleName", color: "Color", color_name: "ColorName", size: "talla" };

export function RevisionSkus({ analisis, archivo, cargado, cargando, onCargar, onCerrar }) {
  const { resumen, filas, qrs_vinculados } = analisis;
  const [soloErrores, setSoloErrores] = useState(resumen.errores > 0);
  const aCargar = resumen.nuevos + resumen.actualizados;
  const visibles = soloErrores ? filas.filter((f) => f.estado === "error") : filas;

  return (
    <Marco
      titulo={cargado ? "Carga de SKUs terminada" : "Revisión del archivo de SKUs"}
      archivo={archivo}
      cargado={cargado}
      resumen={
        <>
          <Chip tono="verde">{pl(resumen.nuevos, "nuevo", "nuevos")}</Chip>
          <Chip tono="azul">{pl(resumen.actualizados, "se actualiza", "se actualizan")}</Chip>
          <Chip tono="gris">{n(resumen.sin_cambios)} sin cambios</Chip>
          {resumen.errores > 0 && <Chip tono="rojo">{n(resumen.errores)} con error</Chip>}
          {cargado && qrs_vinculados > 0 && (
            <Chip tono="verde">{pl(qrs_vinculados, "QR huérfano vinculado", "QRs huérfanos vinculados")}</Chip>
          )}
        </>
      }
      acciones={
        cargado ? (
          <Boton onClick={onCerrar}>Cerrar</Boton>
        ) : (
          <>
            <Boton onClick={onCerrar}>Cancelar</Boton>
            <Boton principal onClick={onCargar} disabled={!aCargar || cargando}>
              {cargando ? <Loader2 size={14} className="animate-spin" /> : null}
              {cargando ? "Cargando…" : `Cargar ${pl(aCargar, "SKU", "SKUs")}`}
            </Boton>
          </>
        )
      }
    >
      {!cargado && resumen.errores > 0 && (
        <Aviso tono="ambar">
          Las filas con error no se cargan. Corrígelas en el Excel y vuelve a importarlo; las que ya se hayan cargado
          aparecerán como «sin cambios».
        </Aviso>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{n(visibles.length)} filas</p>
        {resumen.errores > 0 && (
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            <input type="checkbox" checked={soloErrores} onChange={(e) => setSoloErrores(e.target.checked)} />
            Solo filas con error
          </label>
        )}
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className={thCls}>Línea</th>
              <th className={thCls}>ArSKU</th>
              <th className={thCls}>UPC</th>
              <th className={thCls}>Talla</th>
              <th className={thCls}>Resultado</th>
              <th className={thCls}>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => {
              const [texto, tono] = ESTADO_SKU[f.estado];
              return (
                <tr key={f.linea}>
                  <td className={`${tdCls} text-zinc-500 tabular-nums`}>{f.linea}</td>
                  <td className={`${tdCls} font-mono text-zinc-900`}>{f.sku_number || "—"}</td>
                  <td className={`${tdCls} font-mono text-zinc-600`}>{f.upc || "—"}</td>
                  <td className={`${tdCls} text-zinc-600`}>{f.size || "—"}</td>
                  <td className={tdCls}><Chip tono={tono}>{texto}</Chip></td>
                  <td className={`${tdCls} text-zinc-600`}>
                    {f.errores.length
                      ? f.errores.map((e, i) => <p key={i} className="text-red-800">{e}</p>)
                      : f.cambios.length
                        ? `Cambia: ${f.cambios.map((c) => CAMPO[c] || c).join(", ")}${f.upc_anterior ? ` (UPC anterior ${f.upc_anterior})` : ""}`
                        : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Marco>
  );
}

// ---------------------------------------------------------------- POs
const ESTADO_PO = {
  ok: ["Completa", "verde"],
  incompleta: ["Incompleta", "ambar"],
  error: ["No se importa", "rojo"],
};

function FilaPO({ p, cargado }) {
  const [abierta, setAbierta] = useState(false);
  const [texto, tono] = ESTADO_PO[p.estado];
  const hayDetalle = p.errores.length || p.avisos.length || p.rechazados.length;
  return (
    <>
      <tr className={hayDetalle ? "cursor-pointer hover:bg-zinc-50" : ""} onClick={() => hayDetalle && setAbierta(!abierta)}>
        <td className={`${tdCls} text-zinc-500`}>
          {hayDetalle ? abierta ? <ChevronDown size={13} /> : <ChevronRight size={13} /> : null}
        </td>
        <td className={`${tdCls} font-mono text-zinc-900`}>{p.po_number}</td>
        <td className={`${tdCls} text-zinc-600`}>{p.existe ? p.estado_actual : "Nueva"}</td>
        <td className={`${tdCls} text-right tabular-nums text-zinc-600`}>{n(p.cartones_en_archivo)}</td>
        <td className={`${tdCls} text-right tabular-nums text-emerald-700`}>{p.nuevo ? n(p.nuevo) : "—"}</td>
        <td className={`${tdCls} text-right tabular-nums text-blue-700`}>{p.actualiza ? n(p.actualiza) : "—"}</td>
        <td className={`${tdCls} text-right tabular-nums text-zinc-500`}>{p.sin_cambios ? n(p.sin_cambios) : "—"}</td>
        <td className={`${tdCls} text-right tabular-nums ${p.rechazado ? "text-red-700 font-semibold" : "text-zinc-500"}`}>
          {p.rechazado ? n(p.rechazado) : "—"}
        </td>
        <td className={tdCls}>
          <Chip tono={tono}>{cargado && p.estado !== "error" ? (p.estado === "ok" ? "Cargada" : "Cargada incompleta") : texto}</Chip>
          {p.avisos.length > 0 && <AlertTriangle size={13} className="inline ml-1.5 text-amber-700" />}
        </td>
      </tr>
      {abierta && (
        <tr>
          <td />
          <td colSpan={8} className="px-3 pb-3 pt-1 border-b border-zinc-200 space-y-1.5">
            {p.errores.map((e, i) => <Aviso key={`e${i}`}>{e}</Aviso>)}
            {p.avisos.map((a, i) => <Aviso key={`a${i}`} tono="ambar">{a}</Aviso>)}
            {p.rechazados.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white max-h-48 overflow-auto">
                {p.rechazados.slice(0, 200).map((c) => (
                  <p key={c.carton_id} className="px-3 py-1 text-xs border-b border-zinc-200 last:border-0">
                    <span className="font-mono text-zinc-700">{c.carton_id}</span>
                    <span className="text-red-800"> · {c.errores.join(" · ")}</span>
                  </p>
                ))}
                {p.rechazados.length > 200 && (
                  <p className="px-3 py-1 text-xs text-zinc-500">y {n(p.rechazados.length - 200)} cartones más</p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function RevisionPOs({ analisis, archivo, cargado, cargando, onCargar, onCerrar }) {
  const { resumen, pos, faltantes, errores_archivo } = analisis;
  const conProblema = pos.filter((p) => p.estado !== "ok" || p.avisos.length);
  const [soloProblemas, setSoloProblemas] = useState(conProblema.length > 0);
  const visibles = soloProblemas ? conProblema : pos;
  const aCargar = pos.filter((p) => p.estado !== "error").length;
  const nadaQueCargar = resumen.cartones_nuevos + resumen.cartones_actualizados === 0;
  const paraPlantilla = faltantes.filter((f) => !f.sugerencia);

  return (
    <Marco
      titulo={cargado ? "Importación de POs terminada" : "Revisión del archivo de POs"}
      archivo={archivo}
      cargado={cargado}
      resumen={
        <>
          <Chip tono="verde">{pl(resumen.ok, "PO completa", "POs completas")}</Chip>
          {resumen.incompletas > 0 && <Chip tono="ambar">{pl(resumen.incompletas, "incompleta", "incompletas")}</Chip>}
          {resumen.con_error > 0 && <Chip tono="rojo">{n(resumen.con_error)} no se importan</Chip>}
          <Chip tono="gris">
            Cartones: {n(resumen.cartones_nuevos)} nuevos · {n(resumen.cartones_actualizados)} con cambios ·{" "}
            {n(resumen.cartones_sin_cambios)} sin cambios
          </Chip>
          {resumen.cartones_rechazados > 0 && <Chip tono="rojo">{n(resumen.cartones_rechazados)} cartones rechazados</Chip>}
        </>
      }
      acciones={
        cargado ? (
          <Boton onClick={onCerrar}>Cerrar</Boton>
        ) : (
          <>
            <Boton onClick={onCerrar}>Cancelar</Boton>
            <Boton principal onClick={onCargar} disabled={!aCargar || cargando || nadaQueCargar}>
              {cargando ? <Loader2 size={14} className="animate-spin" /> : null}
              {cargando ? "Importando…" : nadaQueCargar ? "No hay cambios que cargar" : `Importar ${pl(aCargar, "PO", "POs")}`}
            </Boton>
          </>
        )
      }
    >
      {errores_archivo.map((e, i) => <Aviso key={i}>{e}</Aviso>)}

      {!cargado && resumen.incompletas > 0 && (
        <Aviso tono="ambar">
          Las POs incompletas se importan con los cartones válidos, pero no se podrán enviar a T4 hasta que entren los
          cartones rechazados. Corrige lo que falta y vuelve a importar el mismo archivo: lo ya cargado no se duplica.
        </Aviso>
      )}

      {faltantes.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-red-100">
            <p className="text-sm text-red-800 font-medium">
              {faltantes.length === 1 ? "1 SKU no está en el catálogo" : `${n(faltantes.length)} SKUs no están en el catálogo`}
            </p>
            {paraPlantilla.length > 0 && (
              <button
                onClick={() => descargarPlantillaSkus(paraPlantilla)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-900 hover:underline"
              >
                <Download size={13} />
                {paraPlantilla.length === 1
                  ? "Plantilla de SKUs con el faltante"
                  : `Plantilla de SKUs con los ${n(paraPlantilla.length)} faltantes`}
              </button>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thCls}>SKU</th>
                <th className={`${thCls} text-right`}>Cartones</th>
                <th className={`${thCls} text-right`}>Pares</th>
                <th className={thCls}>POs</th>
                <th className={thCls}>Qué hacer</th>
              </tr>
            </thead>
            <tbody>
              {faltantes.map((f) => (
                <tr key={f.sku}>
                  <td className={`${tdCls} font-mono text-zinc-900`}>{f.sku}</td>
                  <td className={`${tdCls} text-right tabular-nums text-zinc-700`}>{n(f.cartones)}</td>
                  <td className={`${tdCls} text-right tabular-nums text-zinc-600`}>{n(f.pares)}</td>
                  <td className={`${tdCls} font-mono text-zinc-600`}>{f.pos.join(", ")}</td>
                  <td className={`${tdCls} ${f.sugerencia ? "text-amber-800" : "text-zinc-600"}`}>
                    {f.sugerencia || "Cargarlo en SKUs (con su UPC) y reimportar este archivo"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{n(visibles.length)} POs · clic en una fila para ver el detalle</p>
        {conProblema.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            <input type="checkbox" checked={soloProblemas} onChange={(e) => setSoloProblemas(e.target.checked)} />
            Solo POs con problemas o avisos
          </label>
        )}
      </div>
      <div className="max-h-[480px] overflow-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className={thCls} />
              <th className={thCls}>PO</th>
              <th className={thCls}>En ScanFlow</th>
              <th className={`${thCls} text-right`}>Cartones</th>
              <th className={`${thCls} text-right`}>Nuevos</th>
              <th className={`${thCls} text-right`}>Cambian</th>
              <th className={`${thCls} text-right`}>Sin cambios</th>
              <th className={`${thCls} text-right`}>Rechazados</th>
              <th className={thCls}>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p) => <FilaPO key={p.po_number} p={p} cargado={cargado} />)}
          </tbody>
        </table>
      </div>
    </Marco>
  );
}

export function BotonPlantilla({ href, children }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
    >
      <Download size={13} /> {children}
    </a>
  );
}
