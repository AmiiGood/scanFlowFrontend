// Autorización de un reset, igual que la liberación de cajas: se elige el
// motivo y, si quien resetea no es superadmin, un supervisor escanea su
// gafete. Todo reset queda registrado (Reportes › Reseteos).
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Loader2, ScanLine, X } from "lucide-react";
import { verificarGafete } from "@/api/supervisores";
import { getMotivosReset } from "@/api/reset";

export default function AutorizarReseteoModal({
  titulo,
  codigo: objetivo,
  advertencia,
  textoBoton,
  requiereGafete,
  ejecutar,
  onClose,
  onHecho,
}) {
  const inputRef = useRef();
  const timer = useRef();
  const [lectura, setLectura] = useState("");
  const [gafete, setGafete] = useState("");
  const [supervisor, setSupervisor] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");

  const { data: motivos = {} } = useQuery({
    queryKey: ["motivos-reset"],
    queryFn: () => getMotivosReset().then((r) => r.data),
    staleTime: Infinity,
  });

  const verificarMut = useMutation({
    mutationFn: (valor) => verificarGafete(valor).then((r) => r.data),
    onSuccess: (sup, valor) => {
      setSupervisor(sup);
      setGafete(valor);
      setError("");
    },
    onError: (e) => {
      setError(e.response?.data?.error || "No se pudo validar el gafete");
      setTimeout(() => inputRef.current?.focus(), 30);
    },
  });

  const ejecutarMut = useMutation({
    mutationFn: () =>
      ejecutar({ motivo, comentario, ...(requiereGafete ? { codigo: gafete } : {}) }).then((r) => r.data),
    onSuccess: (data) => onHecho(data),
    onError: (e) => setError(e.response?.data?.error || "No se pudo completar el reset"),
  });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function validar(valor) {
    clearTimeout(timer.current);
    setLectura("");
    if (valor.trim()) verificarMut.mutate(valor.trim());
  }

  const autorizado = !requiereGafete || supervisor;
  const faltaComentario = motivo === "otro" && !comentario.trim();
  const puedeConfirmar = autorizado && motivo && !faltaComentario && !ejecutarMut.isPending;
  const pasoMotivo = requiereGafete ? 2 : 1;

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-gray-900/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="reset-titulo" className="m-auto w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="reset-titulo" className="text-lg font-bold text-gray-900">{titulo}</h2>
            <p className="text-sm text-gray-500 mt-0.5 font-mono break-all">{objetivo}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">{advertencia}</p>
          </div>

          {/* Paso 1: gafete del supervisor (solo si no es superadmin) */}
          {requiereGafete &&
            (!supervisor ? (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">1. El supervisor escanea su gafete</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    validar(lectura);
                  }}
                  className="relative"
                >
                  <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="password"
                    autoFocus
                    autoComplete="off"
                    value={lectura}
                    disabled={verificarMut.isPending}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLectura(v);
                      clearTimeout(timer.current);
                      if (v.trim()) timer.current = setTimeout(() => validar(v), 150);
                    }}
                    placeholder="Escanea el gafete…"
                    className="w-full h-12 pl-9 pr-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </form>
                {verificarMut.isPending && (
                  <p className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <Loader2 size={14} className="animate-spin" /> Validando gafete…
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                <div className="flex items-center gap-2 text-green-800">
                  <BadgeCheck size={18} />
                  <span className="text-sm">Autoriza <span className="font-semibold">{supervisor.nombre}</span></span>
                </div>
                <button
                  onClick={() => {
                    setSupervisor(null);
                    setGafete("");
                    setTimeout(() => inputRef.current?.focus(), 30);
                  }}
                  className="text-xs font-medium text-green-800 underline"
                >
                  Cambiar
                </button>
              </div>
            ))}

          {/* Motivo */}
          {autorizado && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{pasoMotivo}. ¿Por qué se resetea?</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(motivos).map(([clave, texto]) => (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => setMotivo(clave)}
                    className={`text-left text-sm rounded-xl border px-3 py-2.5 transition-colors ${
                      motivo === clave
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={motivo === "otro" ? "Describe el motivo (requerido)" : "Comentario (opcional)"}
                className="mt-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => ejecutarMut.mutate()}
            disabled={!puedeConfirmar}
            className="h-11 px-5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-30 disabled:pointer-events-none"
          >
            {ejecutarMut.isPending ? "Procesando…" : textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
