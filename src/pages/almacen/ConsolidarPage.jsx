import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Boxes, CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buscarDestino, consolidarCaja, consolidarQR } from "@/api/consolidacion";
import { useSonidosEscaneo } from "@/hooks/useSonidosEscaneo";
import { esEtiquetaCaja, normalizarCodigo } from "@/lib/codigosEscaneo";

// Consolidar cajas (almacén): se escanea la caja que se queda (la de etiqueta
// mejor cuidada) y luego las cajas o pares sueltos del mismo SKU que se le
// quieren meter. La caja puede quedarse incompleta y retomarse después; el
// tope es lo que dice su etiqueta.

// La caja que se está llenando sobrevive a recargar la página (por estación).
const CLAVE_DESTINO = "scanflow.almacen.destino";
const guardarDestino = (codigo) => {
  try {
    if (codigo) localStorage.setItem(CLAVE_DESTINO, codigo);
    else localStorage.removeItem(CLAVE_DESTINO);
  } catch {
    // Sin almacenamiento: solo se pierde la caja al recargar.
  }
};

const pares = (n) => `${n} ${n === 1 ? "par" : "pares"}`;
const error = (e, defecto) => e.response?.data?.error || defecto;

function PanelDestino({ caja }) {
  const pct = Math.min(100, Math.round((caja.disponibles / caja.cantidad_pares) * 100));
  const libres = caja.cantidad_pares - caja.disponibles;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Boxes size={16} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider opacity-80 shrink-0">Llenando</span>
          <span className="font-mono text-sm font-bold truncate">{caja.codigo_caja}</span>
        </div>
        <span className="font-mono text-sm shrink-0">
          {caja.sku_number} <span className="opacity-60">· {caja.size}</span>
        </span>
      </div>
      <div className="p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Pares en la caja</p>
            <p className="text-sm text-gray-500 mt-1">
              {libres > 0 ? `Le caben ${pares(libres)} más` : "Llegó a lo que dice su etiqueta"}
            </p>
          </div>
          <p className="leading-none">
            <span className="text-6xl font-black text-gray-900 tabular-nums">{caja.disponibles}</span>
            <span className="text-xl font-bold text-gray-300"> / {caja.cantidad_pares}</span>
          </p>
        </div>
        <div className="h-6 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${libres > 0 ? "bg-sky-500" : "bg-green-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ConsolidarPage() {
  const { beepOk, beepError, beepComplete } = useSonidosEscaneo();
  const destinoInputRef = useRef();
  const scanInputRef = useRef();
  const flashTimer = useRef();
  const scanTimer = useRef();

  const [codigoDestino, setCodigoDestino] = useState("");
  const [destino, setDestino] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [flash, setFlash] = useState(null);
  const [aviso, setAviso] = useState(null);
  // La caja de origen traía más pares de los que caben: se pasan QR por QR.
  const [separando, setSeparando] = useState(null);
  const [log, setLog] = useState([]);

  const llena = !!destino && destino.disponibles >= destino.cantidad_pares;

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

  // Al volver a la página se recupera la caja que estaba llenando la estación.
  useEffect(() => {
    let guardada = null;
    try {
      guardada = localStorage.getItem(CLAVE_DESTINO);
    } catch {
      guardada = null;
    }
    if (!guardada) return;
    buscarDestino(guardada)
      .then((r) => setDestino(r.data))
      .catch(() => guardarDestino(null));
  }, []);

  // El foco siempre en el campo que toca: caja destino o caja/QR a meter.
  useEffect(() => {
    const enfocar = () => (destino ? scanInputRef : destinoInputRef).current?.focus();
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
  }, [destino]);

  const destinoMut = useMutation({
    mutationFn: (codigoCaja) => buscarDestino(codigoCaja),
    onSuccess: (res) => {
      const caja = res.data;
      beepOk();
      triggerFlash("ok");
      setDestino(caja);
      guardarDestino(caja.codigo_caja);
      setSeparando(null);
      setLog([]);
      setAviso(
        caja.disponibles >= caja.cantidad_pares
          ? { tipo: "error", msg: `Esta caja ya tiene sus ${pares(caja.cantidad_pares)}` }
          : { tipo: "ok", msg: "Escanea las cajas o pares que le vas a meter" },
      );
    },
    onError: (e, codigoCaja) => fallo(error(e, "No se encontró la caja"), codigoCaja),
  });

  function despuesDeMover(data, texto, detalle) {
    setDestino(data.resumen);
    anotar({ ok: true, texto, detalle });
    if (data.resumen.disponibles >= data.resumen.cantidad_pares) {
      beepComplete();
      triggerFlash("complete");
      setSeparando(null);
      setAviso({ tipo: "llena" });
      return;
    }
    beepOk();
    triggerFlash("ok");
    setAviso({ tipo: "ok", msg: `+${pares(data.movidos)}`, detalle });
  }

  const cajaMut = useMutation({
    mutationFn: (codigoCaja) => consolidarCaja(destino.id, codigoCaja),
    onSuccess: (res, codigoCaja) => {
      const data = res.data;
      if (data.requiere_qr) {
        // No es un error, pero hay que detenerse a separar pares.
        beepError();
        triggerFlash("warn");
        setDestino(data.resumen);
        setSeparando({ origen: data.origen, faltan: data.caben });
        setAviso({
          tipo: "separar",
          msg: `Esta caja trae ${pares(data.disponibles)} y solo caben ${data.caben}`,
          detalle: `Separa ${pares(data.caben)} y escanea sus QRs uno por uno. El resto se queda en su caja.`,
        });
        anotar({ ok: false, aviso: true, texto: codigoCaja, detalle: `Separar ${pares(data.caben)}: QR por QR` });
        return;
      }
      setSeparando(null);
      despuesDeMover(data, codigoCaja, "caja completa");
    },
    onError: (e, codigoCaja) => fallo(error(e, "No se pudo pasar la caja"), codigoCaja),
  });

  const qrMut = useMutation({
    mutationFn: (codigoQr) => consolidarQR(destino.id, codigoQr),
    onSuccess: (res, codigoQr) => {
      const data = res.data;
      const libres = data.resumen.cantidad_pares - data.resumen.disponibles;
      if (separando) setSeparando(libres > 0 && separando.faltan > 1 ? { ...separando, faltan: separando.faltan - 1 } : null);
      despuesDeMover(data, codigoQr, `de ${data.origen}`);
    },
    onError: (e, codigoQr) => fallo(error(e, "No se pudo pasar el par"), codigoQr),
  });

  function procesar(valor) {
    const v = valor.trim();
    if (!v || !destino) return;
    if (llena) {
      fallo(`La caja ya tiene sus ${pares(destino.cantidad_pares)}`, v);
      return;
    }
    if (esEtiquetaCaja(v)) cajaMut.mutate(normalizarCodigo(v));
    else qrMut.mutate(v);
  }

  function alEscanear(e, setValor, accion) {
    setValor(e.target.value);
    clearTimeout(scanTimer.current);
    if (e.target.value.trim()) {
      const valor = e.target.value;
      scanTimer.current = setTimeout(() => {
        accion(valor);
        setValor("");
      }, 150);
    }
  }

  function buscarCajaDestino(valor) {
    const v = valor.trim();
    if (v) destinoMut.mutate(normalizarCodigo(v));
  }

  function terminar() {
    if (destino && log.some((l) => l.ok))
      setAviso({ tipo: "ok", msg: "Caja lista", detalle: `${destino.codigo_caja} quedó con ${pares(destino.disponibles)}` });
    else setAviso(null);
    guardarDestino(null);
    setDestino(null);
    setSeparando(null);
    setLog([]);
    setCodigo("");
  }

  const flashBg = { ok: "bg-green-400", error: "bg-red-500", complete: "bg-green-500", warn: "bg-amber-400" };

  return (
    <div className={`min-h-screen transition-colors duration-150 ${flash ? flashBg[flash] : "bg-gray-50"}`}>
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900">ScanFlow</span>
          <span className="text-gray-200">|</span>
          <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Consolidar cajas</span>
        </div>
        {destino && (
          <button
            onClick={terminar}
            className="h-9 px-4 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700"
          >
            Terminar
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Aviso del último escaneo */}
        {aviso?.tipo === "llena" ? (
          <div className="rounded-2xl bg-white border-4 border-green-500 p-8 text-center shadow-xl">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-2" />
            <p className="text-5xl font-black text-green-600 tracking-tight">¡CAJA LLENA!</p>
            <p className="text-gray-400 mt-2 text-lg font-medium">
              {destino?.codigo_caja} tiene los {pares(destino?.cantidad_pares || 0)} de su etiqueta
            </p>
            <button
              onClick={terminar}
              className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700"
            >
              Siguiente caja
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
              {destino ? "Escanea las cajas o pares que le vas a meter" : "Escanea la etiqueta de la caja que se queda"}
            </p>
          </div>
        )}

        {/* Recordatorio mientras se separan pares */}
        {separando && aviso?.tipo !== "separar" && aviso?.tipo !== "llena" && (
          <div className="rounded-xl bg-amber-50 border-2 border-amber-300 px-4 py-2.5 text-amber-800 text-sm font-bold flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            Separando de {separando.origen}: faltan {pares(separando.faltan)} por escanear QR por QR
          </div>
        )}

        {destino && <PanelDestino caja={destino} />}

        {/* Paso 1: la caja que se queda */}
        <div
          className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${
            !destino ? "border-gray-900" : "border-gray-100 opacity-50 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                !destino ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              1
            </div>
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Caja que se queda</span>
            <span className="text-xs text-gray-400">· la de etiqueta mejor cuidada</span>
          </div>
          <Input
            ref={destinoInputRef}
            value={codigoDestino}
            onChange={(e) => alEscanear(e, setCodigoDestino, buscarCajaDestino)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && codigoDestino.trim()) {
                clearTimeout(scanTimer.current);
                buscarCajaDestino(codigoDestino);
                setCodigoDestino("");
              }
            }}
            disabled={!!destino || destinoMut.isPending}
            placeholder="Escanea la etiqueta de la caja..."
            className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-gray-900 h-11 font-mono text-sm bg-gray-50"
          />
        </div>

        {/* Paso 2: cajas o pares a meter */}
        {destino && (
          <div className="bg-white rounded-2xl border-2 border-sky-500 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-xs font-black text-white">
                2
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                {separando ? "Código QR del par" : "Caja o par a meter"}
              </span>
              <span className="text-xs text-gray-400">· mismo SKU, que no esté en un cartón</span>
            </div>
            <Input
              ref={scanInputRef}
              value={codigo}
              onChange={(e) => alEscanear(e, setCodigo, procesar)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codigo.trim()) {
                  clearTimeout(scanTimer.current);
                  procesar(codigo);
                  setCodigo("");
                }
              }}
              placeholder={separando ? "Escanea el QR del par..." : "Escanea la etiqueta de otra caja o el QR de un par..."}
              className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-sky-500 h-11 font-mono text-sm bg-gray-50"
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
                  <span className={`text-xs truncate max-w-[50%] ${entrada.ok ? "text-gray-400" : entrada.aviso ? "text-amber-600" : "text-red-400"}`}>
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
