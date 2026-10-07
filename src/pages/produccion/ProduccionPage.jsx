import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCajas,
  iniciarCaja,
  escanearQR,
  getProgresoCaja,
} from "@/api/cajas";
import { getConfig } from "@/api/config";
import { useLockStore } from "@/store/lockStore";
import { Input } from "@/components/ui/input";
import LiberarCajaModal from "@/components/produccion/LiberarCajaModal";
import {
  ScanLine,
  Box,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";
import * as Tone from "tone";

// Mismo formato que valida el backend: codigoUnico$SKU$pares$secuencial
// (el secuencial puede traer una letra de prefijo en reimpresiones, ej. R2068).
const CAJA_RE = /^\d+\$[A-Z0-9-]+\$\d+\$[A-Z]?\d+$/;
const pareceQR = (valor) => /HTTPS?|CROCS\.COM/i.test(valor);
const normalizarCaja = (valor) =>
  valor.replace(/['{]/g, "-").trim().toUpperCase();
// Una lectura repetida del mismo QR dentro de este lapso se ignora: es el
// lector disparando dos veces, no un segundo par.
const VENTANA_REPETIDO_MS = 3000;

function useSound() {
  const beepOk = useCallback(async () => {
    await Tone.start();
    const synth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 },
    }).toDestination();
    synth.volume.value = 6;
    const now = Tone.now();
    synth.triggerAttackRelease("C6", "16n", now);
    synth.triggerAttackRelease("E6", "16n", now + 0.12);
    setTimeout(() => synth.dispose(), 1000);
  }, []);

  const beepError = useCallback(async () => {
    await Tone.start();
    const synth = new Tone.Synth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
    }).toDestination();
    synth.volume.value = 10;
    const now = Tone.now();
    synth.triggerAttackRelease("A2", "8n", now);
    synth.triggerAttackRelease("G2", "8n", now + 0.2);
    synth.triggerAttackRelease("F2", "8n", now + 0.4);
    setTimeout(() => synth.dispose(), 1500);
  }, []);

  const beepComplete = useCallback(async () => {
    await Tone.start();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.3 },
    }).toDestination();
    synth.volume.value = 8;
    const now = Tone.now();
    synth.triggerAttackRelease("C5", "8n", now);
    synth.triggerAttackRelease("E5", "8n", now + 0.15);
    synth.triggerAttackRelease("G5", "8n", now + 0.3);
    synth.triggerAttackRelease(["C6", "E6", "G6"], "4n", now + 0.45);
    setTimeout(() => synth.dispose(), 2000);
  }, []);

  return { beepOk, beepError, beepComplete };
}

export default function ProduccionPage() {
  const qc = useQueryClient();
  const cajaInputRef = useRef();
  const qrInputRef = useRef();
  const flashTimer = useRef(null);
  const cajaTimer = useRef(null);
  const qrTimer = useRef(null);
  // Refs para que los temporizadores del lector lean el estado actual y no el
  // de cuando se programaron.
  const cajaActivaRef = useRef(null);
  const cajaEnCursoRef = useRef(null);
  const qrsEnCursoRef = useRef(new Set());
  const ultimoQrRef = useRef({ codigo: null, ts: 0 });
  const { beepOk, beepError, beepComplete } = useSound();

  const [cajaActiva, setCajaActiva] = useState(null);
  const [codigoCaja, setCodigoCaja] = useState("");
  const [codigoQR, setCodigoQR] = useState("");
  const [flash, setFlash] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [scanLog, setScanLog] = useState([]);
  const [liberando, setLiberando] = useState(false);

  useEffect(() => {
    // Con la ventana de liberación abierta, el foco es suyo (gafete, motivo).
    if (liberando) return;
    function handleFocusLost() {
      setTimeout(() => {
        const active = document.activeElement;
        const isInput =
          active?.tagName === "INPUT" || active?.tagName === "BUTTON";
        if (!isInput) {
          if (cajaActiva) qrInputRef.current?.focus();
          else cajaInputRef.current?.focus();
        }
      }, 100);
    }

    document.addEventListener("click", handleFocusLost);
    document.addEventListener("focusout", handleFocusLost);
    return () => {
      document.removeEventListener("click", handleFocusLost);
      document.removeEventListener("focusout", handleFocusLost);
    };
  }, [cajaActiva, liberando]);

  const triggerFlash = (type) => {
    clearTimeout(flashTimer.current);
    setFlash(type);
    flashTimer.current = setTimeout(
      () => setFlash(null),
      type === "complete" ? 2500 : 800,
    );
  };

  const { data: progreso, refetch: refetchProgreso } = useQuery({
    queryKey: ["caja-progreso", cajaActiva?.id],
    queryFn: () => getProgresoCaja(cajaActiva.id).then((r) => r.data),
    enabled: !!cajaActiva,
  });

  // Configuración de bloqueo. Se refresca periódicamente para que, si un admin
  // apaga el bloqueo, las pantallas atascadas se liberen sin recargar.
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: () => getConfig().then((r) => r.data),
    refetchInterval: 15000,
    staleTime: 0,
  });

  const bloqueoActivo = config?.bloqueo_caja_produccion === "true";
  // Hay caja en proceso = caja activa sin terminar (al completar, cajaActiva pasa a null).
  const bloqueado = bloqueoActivo && !!cajaActiva;

  const setLocked = useLockStore((s) => s.setLocked);

  // Activar/desactivar el bloqueo global (consumido por el Sidebar).
  useEffect(() => {
    setLocked(bloqueado);
    return () => setLocked(false);
  }, [bloqueado, setLocked]);

  // Bloquear cierre/recarga del navegador mientras hay una caja en proceso.
  useEffect(() => {
    if (!bloqueado) return;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [bloqueado]);

  function activarCaja(caja) {
    cajaActivaRef.current = caja;
    setCajaActiva(caja);
  }

  function rechazar(msg) {
    beepError();
    triggerFlash("error");
    setLastScan({ ok: false, msg });
  }

  const iniciarMut = useMutation({
    mutationFn: iniciarCaja,
    onSuccess: (res) => {
      beepOk();
      triggerFlash("ok");
      setLastScan({
        ok: true,
        msg: "CAJA LISTA",
        escaneados: 0,
        total: res.data.cantidad_pares,
      });
      activarCaja(res.data);
      setScanLog([]);
      setTimeout(() => qrInputRef.current?.focus(), 100);
    },
    onError: (e) => {
      rechazar(e.response?.data?.error || "Caja no encontrada");
      setTimeout(() => cajaInputRef.current?.focus(), 50);
    },
    onSettled: () => {
      cajaEnCursoRef.current = null;
    },
  });

  const scanMut = useMutation({
    mutationFn: ({ id, codigo_qr }) => escanearQR(id, codigo_qr),
    onSuccess: (res, { codigo_qr }) => {
      const data = res.data;
      ultimoQrRef.current = { codigo: codigo_qr, ts: Date.now() };
      setScanLog((prev) => [
        {
          ok: true,
          qr: codigo_qr,
          n: data.escaneados,
          total: data.total,
          ts: new Date(),
        },
        ...prev.slice(0, 49),
      ]);
      if (data.completa) {
        beepComplete();
        triggerFlash("complete");
        setLastScan({
          ok: true,
          completa: true,
          msg: "¡CAJA COMPLETA!",
          escaneados: data.escaneados,
          total: data.total,
        });
        activarCaja(null);
        qc.invalidateQueries(["cajas"]);
        setTimeout(() => {
          setLastScan(null);
          cajaInputRef.current?.focus();
        }, 2500);
      } else {
        beepOk();
        triggerFlash("ok");
        setLastScan({
          ok: true,
          completa: false,
          msg: "OK",
          escaneados: data.escaneados,
          total: data.total,
        });
        refetchProgreso();
        setTimeout(() => qrInputRef.current?.focus(), 30);
      }
    },
    onError: (e, { codigo_qr }) => {
      const msg = e.response?.data?.error || "Error al escanear";
      rechazar(msg);
      setScanLog((prev) => [
        { ok: false, qr: codigo_qr, msg, ts: new Date() },
        ...prev.slice(0, 49),
      ]);
      setTimeout(() => qrInputRef.current?.focus(), 30);
    },
    onSettled: (_data, _err, { codigo_qr }) => {
      qrsEnCursoRef.current.delete(codigo_qr);
    },
  });

  // Única entrada para una lectura de caja, venga del Enter o del temporizador.
  // El campo se vacía de inmediato: si el operador escanea el QR mientras la
  // caja todavía carga, ese QR ya no se pega al código de la caja.
  function enviarCaja(raw) {
    clearTimeout(cajaTimer.current);
    const valor = normalizarCaja(raw || "");
    setCodigoCaja("");
    if (!valor || cajaActivaRef.current) return;

    if (cajaEnCursoRef.current) {
      // La misma etiqueta llegando dos veces (Enter + temporizador): se ignora.
      if (valor === cajaEnCursoRef.current) return;
      rechazar(
        pareceQR(valor)
          ? "Espera a que cargue la caja y vuelve a escanear el QR"
          : "Espera, todavía se está cargando la caja",
      );
      return;
    }

    if (!CAJA_RE.test(valor)) {
      rechazar(
        pareceQR(valor)
          ? "Eso es un QR: primero escanea la etiqueta de la caja"
          : "Formato de caja inválido",
      );
      setTimeout(() => cajaInputRef.current?.focus(), 50);
      return;
    }

    cajaEnCursoRef.current = valor;
    iniciarMut.mutate(valor);
  }

  // Única entrada para una lectura de QR. Descarta la misma lectura repetida
  // (en curso o recién aceptada) para no mandar dos veces el mismo par.
  function enviarQR(raw) {
    clearTimeout(qrTimer.current);
    const codigo = (raw || "").trim();
    setCodigoQR("");
    const caja = cajaActivaRef.current;
    if (!codigo || !caja) return;
    if (qrsEnCursoRef.current.has(codigo)) return;
    const ultimo = ultimoQrRef.current;
    if (ultimo.codigo === codigo && Date.now() - ultimo.ts < VENTANA_REPETIDO_MS)
      return;

    qrsEnCursoRef.current.add(codigo);
    scanMut.mutate({ id: caja.id, codigo_qr: codigo });
  }

  function handleCajaSubmit(e) {
    e.preventDefault();
    enviarCaja(codigoCaja);
  }

  function handleQRSubmit(e) {
    e.preventDefault();
    enviarQR(codigoQR);
  }

  function handleCajaChange(e) {
    const valor = e.target.value;
    setCodigoCaja(valor);
    clearTimeout(cajaTimer.current);
    if (valor.trim()) {
      cajaTimer.current = setTimeout(() => enviarCaja(valor), 150);
    }
  }

  function handleQRChange(e) {
    const valor = e.target.value;
    setCodigoQR(valor);
    clearTimeout(qrTimer.current);
    if (valor.trim()) {
      qrTimer.current = setTimeout(() => enviarQR(valor), 150);
    }
  }

  function resetCaja() {
    activarCaja(null);
    setScanLog([]);
    setLastScan(null);
    setCodigoQR("");
    setTimeout(() => cajaInputRef.current?.focus(), 100);
  }

  function cajaLiberada(supervisor) {
    setLiberando(false);
    resetCaja();
    beepOk();
    triggerFlash("ok");
    setLastScan({ ok: true, msg: `CAJA LIBERADA POR ${supervisor.toUpperCase()}` });
  }

  const escaneados = progreso?.escaneados || 0;
  const totalPares =
    cajaActiva?.cantidad_pares || progreso?.caja?.cantidad_pares || 0;
  const pct = totalPares > 0 ? Math.round((escaneados / totalPares) * 100) : 0;
  const flashBg = {
    ok: "bg-green-400",
    error: "bg-red-500",
    complete: "bg-green-500",
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-150 ${flash ? flashBg[flash] : "bg-gray-50"}`}
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="8"
                height="8"
                rx="1.5"
                fill="white"
                opacity="0.9"
              />
              <rect
                x="13"
                y="3"
                width="8"
                height="8"
                rx="1.5"
                fill="white"
                opacity="0.4"
              />
              <rect
                x="3"
                y="13"
                width="8"
                height="8"
                rx="1.5"
                fill="white"
                opacity="0.4"
              />
              <rect
                x="13"
                y="13"
                width="8"
                height="8"
                rx="1.5"
                fill="white"
                opacity="0.9"
              />
            </svg>
          </div>
          <span className="font-bold text-gray-900 tracking-tight">
            ScanFlow
          </span>
          <span className="text-gray-200">|</span>
          <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">
            Producción
          </span>
        </div>
        {cajaActiva &&
          (bloqueado ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-amber-600 font-semibold">
                <Lock size={14} /> Caja bloqueada hasta completar
              </span>
              <button
                onClick={() => setLiberando(true)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <Unlock size={14} /> Liberar caja
              </button>
            </div>
          ) : (
            <button
              onClick={resetCaja}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
            >
              <RotateCcw size={14} /> Cancelar caja
            </button>
          ))}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Feedback principal */}
        {lastScan?.completa ? (
          <div className="rounded-2xl bg-white border-4 border-green-500 p-8 text-center shadow-xl">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-2" />
            <p className="text-5xl font-black text-green-600 tracking-tight">
              ¡CAJA COMPLETA!
            </p>
            <p className="text-gray-400 mt-2 text-lg font-medium">
              Escanea la siguiente caja
            </p>
          </div>
        ) : lastScan ? (
          <div
            className={`rounded-2xl border-4 p-5 transition-all ${lastScan.ok ? "bg-white border-green-400" : "bg-white border-red-400"}`}
          >
            <div className="flex items-center justify-center gap-3">
              {lastScan.ok ? (
                <CheckCircle2 size={36} className="text-green-500" />
              ) : (
                <XCircle size={36} className="text-red-500" />
              )}
              <span
                className={`text-4xl font-black tracking-tight ${lastScan.ok ? "text-green-600" : "text-red-600"}`}
              >
                {lastScan.msg}
              </span>
            </div>
            {lastScan.ok && lastScan.escaneados && (
              <p className="text-center text-gray-400 text-xl mt-1 font-mono">
                {lastScan.escaneados} / {lastScan.total} pares
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border-2 border-dashed border-gray-200 p-6 text-center">
            <ScanLine size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-300 font-medium">
              {cajaActiva
                ? "Listo para escanear QRs"
                : "Escanea un código de caja para comenzar"}
            </p>
          </div>
        )}

        {/* Progreso caja activa */}
        {cajaActiva && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">
                  Caja activa
                </p>
                <p className="text-2xl font-black text-gray-900 font-mono">
                  {progreso?.caja?.sku_number || "—"}
                </p>
                {progreso?.caja?.style_name && (
                  <p className="text-gray-400 text-sm mt-0.5">
                    {progreso.caja.style_name} · Talla {progreso.caja.size}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-7xl font-black text-gray-900 leading-none tabular-nums">
                  {escaneados}
                </p>
                <p className="text-2xl font-bold text-gray-300 tabular-nums">
                  / {totalPares}
                </p>
              </div>
            </div>
            <div className="h-7 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-sm text-gray-400 font-medium">
                {pct}% completado
              </span>
              <span className="text-sm text-gray-400 font-medium">
                {totalPares - escaneados} restantes
              </span>
            </div>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${!cajaActiva ? "border-gray-900" : "border-gray-100 opacity-50 pointer-events-none"}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${!cajaActiva ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-400"}`}
              >
                1
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Código de caja
              </span>
            </div>
            <form onSubmit={handleCajaSubmit} className="flex gap-2">
              {/* Input caja */}
              <Input
                ref={cajaInputRef}
                value={codigoCaja}
                onChange={handleCajaChange}
                disabled={!!cajaActiva}
                placeholder="Escanea la caja..."
                className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-gray-900 h-11 font-mono text-sm bg-gray-50"
              />
              <button
                type="submit"
                disabled={!!cajaActiva || !codigoCaja.trim()}
                className="h-11 w-11 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 transition-colors shrink-0"
              >
                <Box size={16} />
              </button>
            </form>
          </div>

          <div
            className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${cajaActiva ? "border-green-500" : "border-gray-100 opacity-50 pointer-events-none"}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${cajaActiva ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}
              >
                2
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Código QR
              </span>
            </div>
            <form onSubmit={handleQRSubmit} className="flex gap-2">
              {/* Input QR */}
              <Input
                ref={qrInputRef}
                value={codigoQR}
                onChange={handleQRChange}
                disabled={!cajaActiva}
                placeholder="Escanea el QR del par..."
                className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-green-500 h-11 font-mono text-sm bg-gray-50"
              />
              <button
                type="submit"
                disabled={!cajaActiva || !codigoQR.trim()}
                className="h-11 w-11 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-600 disabled:opacity-30 transition-colors shrink-0"
              >
                <ScanLine size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Log */}
        {scanLog.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Últimos escaneos
              </span>
              <span className="text-xs text-gray-300">
                {scanLog.length} registros
              </span>
            </div>
            <div className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
              {scanLog.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm ${i === 0 ? "bg-gray-50" : ""}`}
                >
                  {entry.ok ? (
                    <CheckCircle2
                      size={14}
                      className="text-green-500 shrink-0"
                    />
                  ) : (
                    <XCircle size={14} className="text-red-500 shrink-0" />
                  )}
                  <span className="font-mono text-gray-500 flex-1 truncate text-xs">
                    {entry.qr}
                  </span>
                  {entry.ok ? (
                    <span className="text-gray-400 text-xs font-mono tabular-nums">
                      {entry.n}/{entry.total}
                    </span>
                  ) : (
                    <span className="text-red-400 text-xs">{entry.msg}</span>
                  )}
                  <span className="text-gray-300 text-xs shrink-0 tabular-nums">
                    {entry.ts.toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {liberando && cajaActiva && (
        <LiberarCajaModal
          caja={cajaActiva}
          escaneados={escaneados}
          onClose={() => setLiberando(false)}
          onLiberada={cajaLiberada}
        />
      )}
    </div>
  );
}
