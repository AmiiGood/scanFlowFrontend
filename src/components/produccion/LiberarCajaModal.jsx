// Liberación de una caja trabada con el bloqueo activo: el supervisor escanea
// su gafete, se elige el motivo y la pantalla de Producción queda libre. La
// caja se queda abierta con los pares que lleva; lo que se registra es quién
// autorizó y por qué.
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, Loader2, ScanLine, X } from "lucide-react";
import {
  getMotivosLiberacion,
  liberarCaja,
  verificarGafete,
} from "@/api/supervisores";

export default function LiberarCajaModal({ caja, escaneados, onClose, onLiberada }) {
  const inputRef = useRef();
  const timer = useRef();
  const [lectura, setLectura] = useState("");
  const [codigo, setCodigo] = useState("");
  const [supervisor, setSupervisor] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");

  const { data: motivos = {} } = useQuery({
    queryKey: ["motivos-liberacion"],
    queryFn: () => getMotivosLiberacion().then((r) => r.data),
    staleTime: Infinity,
  });

  const verificarMut = useMutation({
    mutationFn: (valor) => verificarGafete(valor).then((r) => r.data),
    onSuccess: (sup, valor) => {
      setSupervisor(sup);
      setCodigo(valor);
      setError("");
    },
    onError: (e) => {
      setError(e.response?.data?.error || "No se pudo validar el gafete");
      setTimeout(() => inputRef.current?.focus(), 30);
    },
  });

  const liberarMut = useMutation({
    mutationFn: () =>
      liberarCaja(caja.id, { codigo, motivo, comentario }).then((r) => r.data),
    onSuccess: (res) => onLiberada(res.supervisor),
    onError: (e) => setError(e.response?.data?.error || "No se pudo liberar la caja"),
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

  const faltaComentario = motivo === "otro" && !comentario.trim();
  const puedeLiberar = supervisor && motivo && !faltaComentario && !liberarMut.isPending;

  return (
    // El fondo se desplaza: en pantallas bajas los botones no quedan fuera de alcance.
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-gray-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="liberar-titulo" className="m-auto w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 id="liberar-titulo" className="text-lg font-bold text-gray-900">Liberar caja</h2>
            <p className="text-sm text-gray-500 mt-0.5 font-mono break-all">{caja.codigo_caja}</p>
            <p className="text-sm text-gray-500">
              Lleva <span className="font-semibold text-gray-900">{escaneados} de {caja.cantidad_pares}</span> pares. La caja queda abierta.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Paso 1: gafete del supervisor */}
          {!supervisor ? (
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
                    // Mismo criterio que el resto de la pantalla: el lector
                    // termina de teclear y a los 150 ms se valida.
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
                  setCodigo("");
                  setTimeout(() => inputRef.current?.focus(), 30);
                }}
                className="text-xs font-medium text-green-800 underline"
              >
                Cambiar
              </button>
            </div>
          )}

          {/* Paso 2: motivo */}
          {supervisor && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">2. ¿Por qué se libera?</p>
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
            onClick={() => liberarMut.mutate()}
            disabled={!puedeLiberar}
            className="h-11 px-5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none"
          >
            {liberarMut.isPending ? "Liberando…" : "Liberar caja"}
          </button>
        </div>
      </div>
    </div>
  );
}
