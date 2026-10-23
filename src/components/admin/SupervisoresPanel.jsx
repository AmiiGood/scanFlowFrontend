// Supervisores y líderes que pueden liberar una caja trabada en Producción.
// El código del gafete solo se muestra al crearlo o regenerarlo: la base
// guarda su hash, así que no se puede volver a consultar.
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Printer, RefreshCw, UserPlus } from "lucide-react";
import {
  actualizarSupervisor,
  crearSupervisor,
  getSupervisores,
  regenerarGafete,
} from "@/api/supervisores";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function fmtFechaHora(valor) {
  if (!valor) return "—";
  const [y, m, d] = valor.slice(0, 10).split("-");
  return `${d}/${m}/${y} ${valor.slice(11, 16)}`;
}

function imprimirGafete(nombre, svg) {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  // Credencial vertical de 54 × 86 mm (tamaño tarjeta).
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Gafete ${nombre}</title>
    <style>
      @page { size: 54mm 86mm; margin: 0; }
      body { margin: 0; font-family: system-ui, sans-serif; }
      .gafete { width: 54mm; height: 86mm; box-sizing: border-box; padding: 5mm 4mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; border: 0.3mm solid #d4d4d8; }
      .marca { font-size: 8pt; letter-spacing: 0.08em; color: #52525b; }
      .qr svg { width: 40mm; height: 40mm; }
      .nombre { font-size: 12pt; font-weight: 700; color: #18181b; }
      .rol { font-size: 7.5pt; color: #52525b; }
      .aviso { font-size: 6pt; color: #71717a; }
    </style></head><body>
    <div class="gafete">
      <div class="marca">SCANFLOW · LIBERACIÓN DE CAJAS</div>
      <div class="qr">${svg}</div>
      <div><div class="nombre">${nombre.replace(/</g, "&lt;")}</div><div class="rol">Supervisor autorizado</div></div>
      <div class="aviso">Personal e intransferible. Si se pierde, avisa a TI para darlo de baja.</div>
    </div>
    <script>window.onload = () => { window.print(); };</script>
    </body></html>`);
  w.document.close();
}

function GafeteDialog({ gafete, onClose }) {
  const qrRef = useRef();
  if (!gafete) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-zinc-200 text-zinc-900 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-zinc-900">Gafete de {gafete.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div ref={qrRef} className="mx-auto w-fit rounded-xl bg-white p-4 border border-zinc-200">
            <QRCodeSVG value={gafete.codigo} size={200} level="M" marginSize={0} />
          </div>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
            Imprímelo ahora: este código no se vuelve a mostrar. Si se pierde,
            usa «Regenerar gafete» y el anterior deja de servir.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Cerrar
            </button>
            <button
              onClick={() => imprimirGafete(gafete.nombre, qrRef.current.querySelector("svg").outerHTML)}
              className="flex-1 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 inline-flex items-center justify-center gap-1.5"
            >
              <Printer size={14} /> Imprimir gafete
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SupervisoresPanel() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [gafete, setGafete] = useState(null);
  const [error, setError] = useState("");

  const { data: supervisores = [], isLoading } = useQuery({
    queryKey: ["supervisores"],
    queryFn: () => getSupervisores().then((r) => r.data),
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ["supervisores"] });
  const mostrarGafete = (res) => {
    setGafete({ nombre: res.data.supervisor.nombre, codigo: res.data.codigo });
    refrescar();
  };
  const fallo = (e) => setError(e.response?.data?.error || "No se pudo guardar");

  const crearMut = useMutation({
    mutationFn: crearSupervisor,
    onSuccess: (res) => {
      setNombre("");
      setError("");
      mostrarGafete(res);
    },
    onError: fallo,
  });
  const regenerarMut = useMutation({ mutationFn: regenerarGafete, onSuccess: mostrarGafete, onError: fallo });
  const activoMut = useMutation({
    mutationFn: ({ id, activo }) => actualizarSupervisor(id, { activo }),
    onSuccess: refrescar,
    onError: fallo,
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <BadgeCheck size={18} className="text-blue-700" />
        </div>
        <div>
          <p className="text-zinc-900 font-semibold mb-1">Supervisores que pueden liberar cajas</p>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
            Con el bloqueo activo, un supervisor puede liberar la pantalla de
            Producción escaneando su gafete e indicando el motivo. Cada
            liberación queda en Reportes › Liberaciones.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nombre.trim()) crearMut.mutate(nombre.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del supervisor o líder"
          maxLength={100}
          className="flex-1 h-9 rounded-lg bg-white border border-zinc-200 px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-600/20"
        />
        <button
          type="submit"
          disabled={!nombre.trim() || crearMut.isPending}
          className="h-9 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <UserPlus size={14} /> Agregar y generar gafete
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
              <th className="px-4 py-2.5 font-medium">Supervisor</th>
              <th className="px-4 py-2.5 font-medium text-right">Liberaciones</th>
              <th className="px-4 py-2.5 font-medium">Última</th>
              <th className="px-4 py-2.5 font-medium text-right">Gafete</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500 text-xs">Cargando…</td></tr>
            ) : supervisores.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500 text-xs">Todavía no hay supervisores</td></tr>
            ) : (
              supervisores.map((s) => (
                <tr key={s.id} className="border-b border-zinc-200 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className={s.activo ? "text-zinc-900" : "text-zinc-500 line-through"}>{s.nombre}</p>
                    <p className="text-xs text-zinc-500">Gafete del {fmtFechaHora(s.codigo_generado_at)}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-600 tabular-nums">{s.liberaciones}</td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs tabular-nums">{fmtFechaHora(s.ultima_liberacion)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Generar un gafete nuevo para ${s.nombre}? El actual dejará de servir.`))
                            regenerarMut.mutate(s.id);
                        }}
                        disabled={!s.activo}
                        className="h-7 px-2 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 inline-flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Regenerar
                      </button>
                      <button
                        onClick={() => activoMut.mutate({ id: s.id, activo: !s.activo })}
                        className={`h-7 px-2 rounded-md border text-xs ${
                          s.activo
                            ? "border-red-200 text-red-700 hover:bg-red-100"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {s.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <GafeteDialog gafete={gafete} onClose={() => setGafete(null)} />
    </div>
  );
}
