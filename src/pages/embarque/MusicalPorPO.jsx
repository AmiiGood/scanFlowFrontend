import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, ScanLine, RotateCcw, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buscarPOMusical, asignarCajaPOMusical, asignarQRPOMusical } from "@/api/embarque";
import { useSonidosEscaneo } from "@/hooks/useSonidosEscaneo";
import { esEtiquetaCaja, normalizarCodigo } from "@/lib/codigosEscaneo";
import EncabezadoEmbarque from "./EncabezadoEmbarque";

// Musicales por PO (SOP de musicales): se escribe la PO y se escanean las
// cajas de Producción; sus pares quedan en la PO y el sistema los reparte a
// los cartones musicales. Si la caja trae más pares de los que faltan, se
// separan y se escanean QR por QR en el mismo campo.

// La PO activa sobrevive a recargar la página (por estación).
const CLAVE_PO = "scanflow.embarque.musicalPO";
const guardarPO = (po) => {
  try {
    if (po) localStorage.setItem(CLAVE_PO, po);
    else localStorage.removeItem(CLAVE_PO);
  } catch {
    // Sin almacenamiento: solo se pierde la PO al recargar.
  }
};

const pares = (n) => `${n} ${n === 1 ? "par" : "pares"}`;
const error = (e, defecto) => e.response?.data?.error || defecto;

function PanelPO({ resumen, separando }) {
  const pct = resumen.pedidos > 0 ? Math.round((resumen.asignados / resumen.pedidos) * 100) : 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={16} />
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">PO</span>
          <span className="font-mono text-sm font-bold">{resumen.po.po_number}</span>
        </div>
        <div className="text-sm">
          <span className="tabular-nums font-bold">
            {resumen.cartones_completos}/{resumen.cartones_total}
          </span>{" "}
          <span className="text-xs opacity-70">musicales completos</span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-end justify-between mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Pares en la PO</p>
          <p className="leading-none">
            <span className="text-6xl font-black text-gray-900 tabular-nums">{resumen.asignados}</span>
            <span className="text-xl font-bold text-gray-300"> / {resumen.pedidos}</span>
          </p>
        </div>
        <div className="h-6 rounded-full bg-gray-100 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        <div className="space-y-2">
          {resumen.skus.map((s) => {
            const listo = s.asignados >= s.pedidos;
            const activo = separando?.sku_number === s.sku_number;
            return (
              <div
                key={s.sku_id}
                className={`rounded-lg px-2 py-1 -mx-2 ${activo ? "bg-amber-50 ring-2 ring-amber-400" : ""}`}
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-mono font-medium ${listo ? "text-gray-400" : "text-gray-700"}`}>
                    {listo && <CheckCircle2 size={12} className="inline text-green-500 mr-1 -mt-0.5" />}
                    {s.sku_number}
                  </span>
                  <span className="text-gray-400 tabular-nums">
                    {s.asignados}/{s.pedidos}
                    {!listo && <span className="text-gray-500 font-medium"> · faltan {s.pedidos - s.asignados}</span>}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${listo ? "bg-green-500" : "bg-amber-400"}`}
                    style={{ width: `${Math.min(100, Math.round((s.asignados / s.pedidos) * 100))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MusicalPorPO({ selector }) {
  const { beepOk, beepError, beepComplete } = useSonidosEscaneo();
  const poInputRef = useRef();
  const scanInputRef = useRef();
  const flashTimer = useRef();
  const scanTimer = useRef();

  const [poTexto, setPoTexto] = useState("");
  const [resumen, setResumen] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [flash, setFlash] = useState(null);
  const [aviso, setAviso] = useState(null);
  // SKU del que se están separando pares (la caja traía más de los que faltan).
  const [separando, setSeparando] = useState(null);
  const [log, setLog] = useState([]);

  const completa = !!resumen && resumen.pedidos > 0 && resumen.asignados >= resumen.pedidos;

  function triggerFlash(tipo) {
    clearTimeout(flashTimer.current);
    setFlash(tipo);
    flashTimer.current = setTimeout(() => setFlash(null), tipo === "complete" ? 2500 : 800);
  }

  function anotar(entrada) {
    setLog((prev) => [{ ...entrada, ts: new Date() }, ...prev.slice(0, 49)]);
  }

  function fallo(msg, texto) {
    beepError();
    triggerFlash("error");
    setAviso({ tipo: "error", msg });
    if (texto) anotar({ ok: false, texto, detalle: msg });
  }

  // Al volver a la página se recupera la PO que estaba trabajando la estación.
  useEffect(() => {
    let guardada = null;
    try {
      guardada = localStorage.getItem(CLAVE_PO);
    } catch {
      guardada = null;
    }
    if (!guardada) return;
    buscarPOMusical(guardada)
      .then((r) => {
        setResumen(r.data);
        if (r.data.pedidos > 0 && r.data.asignados >= r.data.pedidos) setAviso({ tipo: "completa" });
      })
      .catch(() => guardarPO(null));
  }, []);

  // El foco siempre en el campo que toca: PO o caja/QR.
  useEffect(() => {
    const enfocar = () => (resumen ? scanInputRef : poInputRef).current?.focus();
    setTimeout(enfocar, 100);
    function alPerderFoco() {
      setTimeout(() => {
        const activo = document.activeElement;
        if (activo?.tagName === "INPUT" || activo?.tagName === "BUTTON") return;
        enfocar();
      }, 100);
    }
    document.addEventListener("click", alPerderFoco);
    document.addEventListener("focusout", alPerderFoco);
    return () => {
      document.removeEventListener("click", alPerderFoco);
      document.removeEventListener("focusout", alPerderFoco);
    };
  }, [resumen]);

  const buscarMut = useMutation({
    mutationFn: (po) => buscarPOMusical(po),
    onSuccess: (res) => {
      beepOk();
      triggerFlash("ok");
      setResumen(res.data);
      guardarPO(res.data.po.po_number);
      setPoTexto("");
      setSeparando(null);
      setLog([]);
      setAviso({ tipo: "ok", msg: `PO ${res.data.po.po_number}: escanea las cajas` });
    },
    onError: (e) => fallo(error(e, "No se encontró la PO")),
  });

  function despuesDeAsignar(data, texto, detalle) {
    setResumen(data.resumen);
    anotar({ ok: true, texto, detalle });
    const r = data.resumen;
    if (r.pedidos > 0 && r.asignados >= r.pedidos) {
      beepComplete();
      triggerFlash("complete");
      setSeparando(null);
      setAviso({ tipo: "completa" });
      return;
    }
    beepOk();
    triggerFlash("ok");
    const extra =
      data.cartones_completados > 0
        ? ` · ${data.cartones_completados} ${data.cartones_completados === 1 ? "musical completo" : "musicales completos"}`
        : "";
    setAviso({ tipo: "ok", msg: `+${pares(data.asignados)} · ${data.sku_number}`, detalle: detalle + extra });
  }

  const cajaMut = useMutation({
    mutationFn: (codigoCaja) => asignarCajaPOMusical(resumen.po.id, codigoCaja),
    onSuccess: (res, codigoCaja) => {
      const data = res.data;
      if (data.requiere_qr) {
        // No es un error del operador, pero hay que detenerse a separar pares.
        beepError();
        triggerFlash("warn");
        setResumen(data.resumen);
        setSeparando({ sku_number: data.sku_number, faltan: data.faltan });
        setAviso({
          tipo: "separar",
          msg: `Esta PO solo necesita ${data.faltan} de los ${data.disponibles} pares de esta caja`,
          detalle: `Separa ${pares(data.faltan)} de ${data.sku_number} y escanea sus QRs uno por uno. El resto se queda en la caja.`,
        });
        anotar({ ok: false, aviso: true, texto: codigoCaja, detalle: `Separar ${pares(data.faltan)}: QR por QR` });
        return;
      }
      setSeparando(null);
      despuesDeAsignar(data, codigoCaja, "caja completa");
    },
    onError: (e, codigoCaja) => fallo(error(e, "Error al asignar la caja"), codigoCaja),
  });

  const qrMut = useMutation({
    mutationFn: (codigoQr) => asignarQRPOMusical(resumen.po.id, codigoQr),
    onSuccess: (res, codigoQr) => {
      const data = res.data;
      if (separando && data.sku_number === separando.sku_number)
        setSeparando(data.faltan_sku > 0 ? { ...separando, faltan: data.faltan_sku } : null);
      despuesDeAsignar(
        data,
        codigoQr,
        data.faltan_sku > 0 ? `faltan ${pares(data.faltan_sku)} de este SKU` : "SKU completo",
      );
    },
    onError: (e, codigoQr) => fallo(error(e, "Error al asignar el QR"), codigoQr),
  });

  function procesar(valor) {
    const v = valor.trim();
    if (!v || !resumen) return;
    if (completa) {
      fallo("La PO ya tiene todos sus pares musicales");
      return;
    }
    if (esEtiquetaCaja(v)) cajaMut.mutate(normalizarCodigo(v));
    else qrMut.mutate(v);
  }

  function handleScanChange(e) {
    setCodigo(e.target.value);
    clearTimeout(scanTimer.current);
    if (e.target.value.trim()) {
      const valor = e.target.value;
      scanTimer.current = setTimeout(() => {
        procesar(valor);
        setCodigo("");
      }, 150);
    }
  }

  function cambiarPO() {
    guardarPO(null);
    setResumen(null);
    setSeparando(null);
    setAviso(null);
    setLog([]);
    setCodigo("");
  }

  const flashBg = { ok: "bg-green-400", error: "bg-red-500", complete: "bg-green-500", warn: "bg-amber-400" };

  return (
    <div className={`min-h-screen transition-colors duration-150 ${flash ? flashBg[flash] : "bg-gray-50"}`}>
      <EncabezadoEmbarque selector={selector}>
        {resumen && (
          <button
            onClick={cambiarPO}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
          >
            <RotateCcw size={14} /> Cambiar PO
          </button>
        )}
      </EncabezadoEmbarque>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Aviso del último escaneo */}
        {aviso?.tipo === "completa" ? (
          <div className="rounded-2xl bg-white border-4 border-green-500 p-8 text-center shadow-xl">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-2" />
            <p className="text-5xl font-black text-green-600 tracking-tight">¡MUSICALES COMPLETOS!</p>
            <p className="text-gray-400 mt-2 text-lg font-medium">
              Todos los pares de los musicales de la PO {resumen?.po.po_number} están asignados
            </p>
            <button
              onClick={cambiarPO}
              className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700"
            >
              Siguiente PO
            </button>
          </div>
        ) : aviso?.tipo === "separar" ? (
          <div className="rounded-2xl bg-white border-4 border-amber-400 p-5">
            <div className="flex items-center justify-center gap-3">
              <AlertTriangle size={36} className="text-amber-500 shrink-0" />
              <span className="text-3xl font-black tracking-tight text-amber-600">{aviso.msg}</span>
            </div>
            <p className="text-center text-gray-600 text-lg mt-2 font-medium">{aviso.detalle}</p>
          </div>
        ) : aviso ? (
          <div className={`rounded-2xl border-4 p-5 bg-white ${aviso.tipo === "ok" ? "border-green-400" : "border-red-400"}`}>
            <div className="flex items-center justify-center gap-3">
              {aviso.tipo === "ok" ? (
                <CheckCircle2 size={36} className="text-green-500 shrink-0" />
              ) : (
                <XCircle size={36} className="text-red-500 shrink-0" />
              )}
              <span className={`text-4xl font-black tracking-tight ${aviso.tipo === "ok" ? "text-green-600" : "text-red-600"}`}>
                {aviso.msg}
              </span>
            </div>
            {aviso.detalle && <p className="text-center text-gray-400 text-lg mt-1">{aviso.detalle}</p>}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border-2 border-dashed border-gray-200 p-6 text-center">
            <ScanLine size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-300 font-medium">
              {resumen ? "Escanea la etiqueta de la caja" : "Escribe el número de PO para comenzar"}
            </p>
          </div>
        )}

        {/* Recordatorio mientras se separan pares */}
        {separando && aviso?.tipo !== "separar" && aviso?.tipo !== "completa" && (
          <div className="rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-2.5 text-amber-800 text-sm font-bold flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            Separando {separando.sku_number}: faltan {pares(separando.faltan)} por escanear QR por QR
          </div>
        )}

        {resumen && <PanelPO resumen={resumen} separando={separando} />}

        {/* Paso 1: PO */}
        <div
          className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
            !resumen ? "border-gray-900" : "border-gray-100 opacity-50 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                !resumen ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              1
            </div>
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Número de PO</span>
          </div>
          <Input
            ref={poInputRef}
            value={poTexto}
            onChange={(e) => setPoTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && poTexto.trim()) buscarMut.mutate(poTexto.trim());
            }}
            disabled={!!resumen || buscarMut.isPending}
            inputMode="numeric"
            placeholder="Escribe la PO y presiona Enter..."
            className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-gray-900 h-11 font-mono text-sm bg-gray-50"
          />
        </div>

        {/* Paso 2: cajas (o QRs al separar) */}
        {resumen && (
          <div className="bg-white rounded-2xl border-2 border-amber-400 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs font-black text-white">
                2
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                {separando ? "Código QR del par" : "Etiqueta de caja"}
              </span>
              <span className="text-xs text-gray-400">· también acepta QRs sueltos</span>
            </div>
            <Input
              ref={scanInputRef}
              value={codigo}
              onChange={handleScanChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codigo.trim()) {
                  clearTimeout(scanTimer.current);
                  procesar(codigo);
                  setCodigo("");
                }
              }}
              placeholder={separando ? "Escanea el QR del par..." : "Escanea la etiqueta de la caja..."}
              className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-amber-400 h-11 font-mono text-sm bg-gray-50"
            />
          </div>
        )}

        {/* Últimos escaneos */}
        {log.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Últimos escaneos</span>
              <span className="text-xs text-gray-300">{log.length} registros</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
              {log.map((entrada, i) => (
                <div key={i} className={`flex items-center gap-3 px-5 py-2.5 ${i === 0 ? "bg-gray-50" : ""}`}>
                  {entrada.ok ? (
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  ) : entrada.aviso ? (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-500 shrink-0" />
                  )}
                  <span className="font-mono text-gray-500 flex-1 truncate text-xs">{entrada.texto}</span>
                  <span className={`text-xs ${entrada.ok ? "text-gray-400" : entrada.aviso ? "text-amber-600" : "text-red-400"}`}>
                    {entrada.detalle}
                  </span>
                  <span className="text-gray-300 text-xs shrink-0 tabular-nums">
                    {entrada.ts.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
