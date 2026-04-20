import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCartonByCodigo,
  asignarCaja,
  reasociarQR,
  getProgresoMusical,
} from "@/api/embarque";
import { getCajas } from "@/api/cajas";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Package,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import * as Tone from "tone";

function getModoEscaneo(carton) {
  if (!carton) return null;
  if (carton.tipo === "musical") return "qr";
  const total =
    carton.detalles?.reduce((s, d) => s + d.cantidad_esperada, 0) || 0;
  return carton.tipo === "mono_sku" && total < 12 ? "qr" : "caja";
}

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

export default function EmbarquePage() {
  const qc = useQueryClient();
  const cartonInputRef = useRef();
  const cajaInputRef = useRef();
  const qrInputRef = useRef();
  const flashTimer = useRef();
  const scanTimer = useRef();
  const { beepOk, beepError, beepComplete } = useSound();

  const [cartonActivo, setCartonActivo] = useState(null);
  const [codigoCarton, setCodigoCarton] = useState("");
  const [codigoCaja, setCodigoCaja] = useState("");
  const [codigoQR, setCodigoQR] = useState("");
  const [flash, setFlash] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [scanLog, setScanLog] = useState([]);

  const modoEscaneo = getModoEscaneo(cartonActivo);
  const esParcial =
    cartonActivo?.tipo === "mono_sku" && modoEscaneo === "qr";

  const triggerFlash = (type) => {
    clearTimeout(flashTimer.current);
    setFlash(type);
    flashTimer.current = setTimeout(
      () => setFlash(null),
      type === "complete" ? 2500 : 800,
    );
  };

  // Focus automático según estado
  useEffect(() => {
    if (!cartonActivo) {
      setTimeout(() => cartonInputRef.current?.focus(), 100);
    } else if (modoEscaneo === "caja") {
      setTimeout(() => cajaInputRef.current?.focus(), 100);
    } else {
      setTimeout(() => qrInputRef.current?.focus(), 100);
    }
  }, [cartonActivo, modoEscaneo]);

  // Mantener focus en el input activo
  useEffect(() => {
    function handleFocusLost() {
      setTimeout(() => {
        const active = document.activeElement;
        if (active?.tagName === "INPUT" || active?.tagName === "BUTTON") return;
        if (!cartonActivo) cartonInputRef.current?.focus();
        else if (modoEscaneo === "caja") cajaInputRef.current?.focus();
        else qrInputRef.current?.focus();
      }, 100);
    }
    document.addEventListener("click", handleFocusLost);
    document.addEventListener("focusout", handleFocusLost);
    return () => {
      document.removeEventListener("click", handleFocusLost);
      document.removeEventListener("focusout", handleFocusLost);
    };
  }, [cartonActivo, modoEscaneo]);

  const { data: progresoMusical, refetch: refetchProgreso } = useQuery({
    queryKey: ["progreso-musical", cartonActivo?.id],
    queryFn: () => getProgresoMusical(cartonActivo.id).then((r) => r.data),
    enabled: !!cartonActivo && modoEscaneo === "qr",
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ["cajas-empacadas"],
    queryFn: () => getCajas({ estado: "empacada" }).then((r) => r.data),
    enabled: !!cartonActivo && modoEscaneo === "caja",
  });

  // Buscar cartón al escanear
  const buscarCartonMut = useMutation({
    mutationFn: (codigo) => getCartonByCodigo(codigo),
    onSuccess: (res) => {
      const carton = res.data;
      if (carton.estado === "completo") {
        beepError();
        triggerFlash("error");
        setLastScan({ ok: false, msg: "Cartón ya está completo" });
        setCodigoCarton("");
        return;
      }
      beepOk();
      triggerFlash("ok");
      setCartonActivo(carton);
      const modo = getModoEscaneo(carton);
      const esParcialNuevo = carton.tipo === "mono_sku" && modo === "qr";
      setLastScan({
        ok: true,
        msg:
          carton.tipo === "musical"
            ? "MUSICAL — Escanea QRs"
            : esParcialNuevo
              ? "PARCIAL — Escanea QRs"
              : "MONO SKU — Escanea la caja",
        tipo: carton.tipo,
      });
      setCodigoCarton("");
      setScanLog([]);
    },
    onError: (e) => {
      beepError();
      triggerFlash("error");
      setLastScan({
        ok: false,
        msg: e.response?.data?.error || "Cartón no encontrado",
      });
      setCodigoCarton("");
    },
  });

  const asignarMut = useMutation({
    mutationFn: (caja_id) => asignarCaja(cartonActivo.id, caja_id),
    onSuccess: () => {
      beepComplete();
      triggerFlash("complete");
      setLastScan({ ok: true, completa: true, msg: "¡CARTÓN COMPLETO!" });
      qc.invalidateQueries(["cajas-empacadas"]);
      setTimeout(() => {
        setCartonActivo(null);
        setLastScan(null);
      }, 2500);
    },
    onError: (e) => {
      beepError();
      triggerFlash("error");
      setLastScan({
        ok: false,
        msg: e.response?.data?.error || "Error al asignar caja",
      });
      setTimeout(() => cajaInputRef.current?.focus(), 50);
    },
  });

  const reasociarMut = useMutation({
    mutationFn: (codigo_qr) => reasociarQR(cartonActivo.id, codigo_qr),
    onSuccess: (res) => {
      const data = res.data;
      const qrEscaneado = codigoQR;
      setCodigoQR("");
      if (data.completo) {
        beepComplete();
        triggerFlash("complete");
        setLastScan({ ok: true, completa: true, msg: "¡CARTÓN COMPLETO!" });
        setScanLog((prev) => [
          {
            ok: true,
            qr: qrEscaneado,
            n: data.reasociados,
            total: data.total,
            ts: new Date(),
          },
          ...prev.slice(0, 49),
        ]);
        setTimeout(() => {
          setCartonActivo(null);
          setLastScan(null);
        }, 2500);
      } else {
        beepOk();
        triggerFlash("ok");
        setLastScan({
          ok: true,
          msg: "OK",
          escaneados: data.reasociados,
          total: data.total,
        });
        setScanLog((prev) => [
          {
            ok: true,
            qr: qrEscaneado,
            n: data.reasociados,
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
      const msg = e.response?.data?.error || "Error al reasociar";
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

  // Auto-submit handlers
  function handleCartonChange(e) {
    setCodigoCarton(e.target.value);
    clearTimeout(scanTimer.current);
    if (e.target.value.trim()) {
      scanTimer.current = setTimeout(() => {
        buscarCartonMut.mutate(e.target.value.trim());
      }, 150);
    }
  }

  function normalizarCodigo(codigo) {
    return codigo.replace(/['{]/g, "-");
  }

  function handleCajaChange(e) {
    setCodigoCaja(e.target.value);
    clearTimeout(scanTimer.current);
    if (e.target.value.trim()) {
      scanTimer.current = setTimeout(() => {
        const codigoNormalizado = normalizarCodigo(e.target.value.trim());
        const caja = cajas.find((c) => c.codigo_caja === codigoNormalizado);
        if (caja) {
          asignarMut.mutate(caja.id);
          setCodigoCaja("");
        } else {
          beepError();
          triggerFlash("error");
          setLastScan({ ok: false, msg: "Caja no encontrada o no empacada" });
          setCodigoCaja("");
        }
      }, 150);
    }
  }

  function handleQRChange(e) {
    setCodigoQR(e.target.value);
    clearTimeout(scanTimer.current);
    if (e.target.value.trim()) {
      scanTimer.current = setTimeout(() => {
        reasociarMut.mutate(e.target.value.trim());
        setCodigoQR("");
      }, 150);
    }
  }

  function resetCarton() {
    setCartonActivo(null);
    setScanLog([]);
    setLastScan(null);
    setCodigoCarton("");
    setCodigoCaja("");
    setCodigoQR("");
  }

  const flashBg = {
    ok: "bg-green-400",
    error: "bg-red-500",
    complete: "bg-green-500",
  };

  const escaneadosMusical =
    progresoMusical?.progreso_por_sku?.reduce(
      (s, p) => s + parseInt(p.reasociados),
      0,
    ) || 0;
  const totalMusical =
    cartonActivo?.detalles?.reduce((s, d) => s + d.cantidad_esperada, 0) || 0;
  const pctMusical =
    totalMusical > 0 ? Math.round((escaneadosMusical / totalMusical) * 100) : 0;

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
          <span className="font-bold text-gray-900">ScanFlow</span>
          <span className="text-gray-200">|</span>
          <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">
            Embarque
          </span>
        </div>
        {cartonActivo && (
          <button
            onClick={resetCarton}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
          >
            <RotateCcw size={14} /> Cancelar cartón
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Feedback */}
        {lastScan?.completa ? (
          <div className="rounded-2xl bg-white border-4 border-green-500 p-8 text-center shadow-xl">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-2" />
            <p className="text-5xl font-black text-green-600 tracking-tight">
              ¡CARTÓN COMPLETO!
            </p>
            <p className="text-gray-400 mt-2 text-lg font-medium">
              Escanea el siguiente cartón
            </p>
          </div>
        ) : lastScan ? (
          <div
            className={`rounded-2xl border-4 p-5 ${lastScan.ok ? "bg-white border-green-400" : "bg-white border-red-400"}`}
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
                {lastScan.escaneados} / {lastScan.total}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border-2 border-dashed border-gray-200 p-6 text-center">
            <ScanLine size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-300 font-medium">
              {!cartonActivo
                ? "Escanea el código del cartón para comenzar"
                : modoEscaneo === "caja"
                  ? "Escanea la caja empacada"
                  : "Escanea QRs del cartón"}
            </p>
          </div>
        )}

        {/* Info cartón activo */}
        {cartonActivo && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">
                  Cartón activo
                </p>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {cartonActivo.carton_id}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      cartonActivo.tipo === "musical"
                        ? "bg-amber-100 text-amber-600"
                        : esParcial
                          ? "bg-purple-100 text-purple-600"
                          : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {cartonActivo.tipo === "musical"
                      ? "🎵 Musical"
                      : esParcial
                        ? "📦 Parcial"
                        : "📦 Mono SKU"}
                  </span>
                  <span className="text-xs text-gray-400">
                    PO {cartonActivo.po_number}
                  </span>
                </div>
              </div>
              {modoEscaneo === "qr" && (
                <div className="text-right">
                  <p className="text-6xl font-black text-gray-900 tabular-nums leading-none">
                    {escaneadosMusical}
                  </p>
                  <p className="text-xl font-bold text-gray-300">
                    / {totalMusical}
                  </p>
                </div>
              )}
            </div>

            {/* Progreso musical por SKU */}
            {modoEscaneo === "qr" && progresoMusical && (
              <>
                <div className="h-6 rounded-full bg-gray-100 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${pctMusical}%` }}
                  />
                </div>
                <div className="space-y-2">
                  {progresoMusical.carton?.detalles?.map((d) => {
                    const progSku = progresoMusical.progreso_por_sku?.find(
                      (p) => p.sku_id === d.sku_id,
                    );
                    const reasociados = parseInt(progSku?.reasociados || 0);
                    const pct = Math.round(
                      (reasociados / d.cantidad_esperada) * 100,
                    );
                    return (
                      <div key={d.sku_id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-mono text-gray-600 font-medium">
                            {d.sku_number}
                          </span>
                          <span className="text-gray-400 tabular-nums">
                            {reasociados}/{d.cantidad_esperada}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Detalle mono SKU */}
            {modoEscaneo === "caja" && (
              <div className="space-y-1">
                {cartonActivo.detalles?.map((d) => (
                  <div
                    key={d.sku_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono text-gray-600">
                      {d.sku_number}
                    </span>
                    <span className="text-gray-400">
                      {d.cantidad_esperada} pares
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inputs */}
        <div
          className={`bg-white rounded-2xl border-2 p-5 shadow-sm transition-all ${!cartonActivo ? "border-gray-900" : "border-gray-100 opacity-50 pointer-events-none"}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${!cartonActivo ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-400"}`}
            >
              1
            </div>
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Código de cartón
            </span>
          </div>
          <Input
            ref={cartonInputRef}
            value={codigoCarton}
            onChange={handleCartonChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && codigoCarton.trim()) {
                clearTimeout(scanTimer.current);
                buscarCartonMut.mutate(codigoCarton.trim());
              }
            }}
            disabled={!!cartonActivo}
            placeholder="Escanea el cartón..."
            className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-gray-900 h-11 font-mono text-sm bg-gray-50"
          />
        </div>

        {/* Input caja — mono SKU */}
        {modoEscaneo === "caja" && (
          <div className="bg-white rounded-2xl border-2 border-blue-500 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black text-white">
                2
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Código de caja
              </span>
            </div>
            <Input
              ref={cajaInputRef}
              value={codigoCaja}
              onChange={handleCajaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codigoCaja.trim()) {
                  clearTimeout(scanTimer.current);
                  const caja = cajas.find(
                    (c) => c.codigo_caja === normalizarCodigo(codigoCaja.trim()),
                  );
                  if (caja) {
                    asignarMut.mutate(caja.id);
                    setCodigoCaja("");
                  } else {
                    beepError();
                    triggerFlash("error");
                    setLastScan({ ok: false, msg: "Caja no encontrada" });
                    setCodigoCaja("");
                  }
                }
              }}
              placeholder="Escanea la caja empacada..."
              className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-blue-500 h-11 font-mono text-sm bg-gray-50"
            />
          </div>
        )}

        {/* Input QR — musical o parcial */}
        {modoEscaneo === "qr" && (
          <div className="bg-white rounded-2xl border-2 border-amber-400 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs font-black text-white">
                2
              </div>
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Código QR
              </span>
            </div>
            <Input
              ref={qrInputRef}
              value={codigoQR}
              onChange={handleQRChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && codigoQR.trim()) {
                  clearTimeout(scanTimer.current);
                  reasociarMut.mutate(codigoQR.trim());
                  setCodigoQR("");
                }
              }}
              placeholder="Escanea el QR del par..."
              className="border-gray-300 text-gray-900 placeholder:text-gray-300 focus-visible:ring-amber-400 h-11 font-mono text-sm bg-gray-50"
            />
          </div>
        )}

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
            <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
              {scanLog.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-5 py-2.5 ${i === 0 ? "bg-gray-50" : ""}`}
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
                    <span className="text-gray-400 text-xs tabular-nums">
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
