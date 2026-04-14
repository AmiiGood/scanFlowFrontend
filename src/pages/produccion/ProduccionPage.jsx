import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCajas,
  iniciarCaja,
  escanearQR,
  getProgresoCaja,
} from "@/api/cajas";
import { Input } from "@/components/ui/input";
import { ScanLine, Box, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import * as Tone from "tone";

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
  const { beepOk, beepError, beepComplete } = useSound();

  const [cajaActiva, setCajaActiva] = useState(null);
  const [codigoCaja, setCodigoCaja] = useState("");
  const [codigoQR, setCodigoQR] = useState("");
  const [flash, setFlash] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [scanLog, setScanLog] = useState([]);

  useEffect(() => {
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
  }, [cajaActiva]);

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
      setCajaActiva(res.data);
      setCodigoCaja("");
      setScanLog([]);
      setTimeout(() => qrInputRef.current?.focus(), 100);
    },
    onError: (e) => {
      beepError();
      triggerFlash("error");
      setLastScan({
        ok: false,
        msg: e.response?.data?.error || "Caja no encontrada",
      });
      setCodigoCaja("");
      setTimeout(() => cajaInputRef.current?.focus(), 50);
    },
  });

  const scanMut = useMutation({
    mutationFn: ({ id, codigo_qr }) => escanearQR(id, codigo_qr),
    onSuccess: (res) => {
      const data = res.data;
      const qrEscaneado = codigoQR;
      setCodigoQR("");
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
        setScanLog((prev) => [
          {
            ok: true,
            qr: qrEscaneado,
            n: data.escaneados,
            total: data.total,
            ts: new Date(),
          },
          ...prev.slice(0, 49),
        ]);
        setCajaActiva(null);
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
        setScanLog((prev) => [
          {
            ok: true,
            qr: qrEscaneado,
            n: data.escaneados,
            total: data.total,
            ts: new Date(),
          },
          ...prev.slice(0, 49),
        ]);
        refetchProgreso();
        setTimeout(() => qrInputRef.current?.focus(), 30);
      }
    },
    onError: (e) => {
      const msg = e.response?.data?.error || "Error al escanear";
      const qrEscaneado = codigoQR;
      beepError();
      triggerFlash("error");
      setLastScan({ ok: false, msg });
      setScanLog((prev) => [
        { ok: false, qr: qrEscaneado, msg, ts: new Date() },
        ...prev.slice(0, 49),
      ]);
      setCodigoQR("");
      setTimeout(() => qrInputRef.current?.focus(), 30);
    },
  });

  function handleCajaSubmit(e) {
    e.preventDefault();
    if (!codigoCaja.trim()) return;
    iniciarMut.mutate(codigoCaja.trim());
  }

  function handleQRSubmit(e) {
    e.preventDefault();
    if (!codigoQR.trim() || !cajaActiva) return;
    scanMut.mutate({ id: cajaActiva.id, codigo_qr: codigoQR.trim() });
  }

  function handleCajaChange(e) {
    setCodigoCaja(e.target.value);
    clearTimeout(cajaTimer.current);
    if (e.target.value.trim()) {
      cajaTimer.current = setTimeout(() => {
        if (!cajaActiva) iniciarMut.mutate(e.target.value.trim());
      }, 150);
    }
  }

  function handleQRChange(e) {
    setCodigoQR(e.target.value);
    clearTimeout(qrTimer.current);
    if (e.target.value.trim()) {
      qrTimer.current = setTimeout(() => {
        if (cajaActiva) {
          scanMut.mutate({
            id: cajaActiva.id,
            codigo_qr: e.target.value.trim(),
          });
          setCodigoQR("");
        }
      }, 150);
    }
  }

  function resetCaja() {
    setCajaActiva(null);
    setScanLog([]);
    setLastScan(null);
    setCodigoQR("");
    setTimeout(() => cajaInputRef.current?.focus(), 100);
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
        {cajaActiva && (
          <button
            onClick={resetCaja}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
          >
            <RotateCcw size={14} /> Cancelar caja
          </button>
        )}
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
                onKeyDown={(e) => e.key === "Enter" && handleCajaSubmit(e)}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && codigoQR.trim() && cajaActiva) {
                    clearTimeout(qrTimer.current);
                    scanMut.mutate({
                      id: cajaActiva.id,
                      codigo_qr: codigoQR.trim(),
                    });
                    setCodigoQR("");
                  }
                }}
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
    </div>
  );
}
