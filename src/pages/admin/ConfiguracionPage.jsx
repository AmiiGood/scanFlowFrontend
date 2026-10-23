import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getConfig, updateConfig } from "@/api/config";
import PageHeader from "@/components/layout/PageHeader";
import SupervisoresPanel from "@/components/admin/SupervisoresPanel";
import { Lock, ShieldAlert, Loader2 } from "lucide-react";

export default function ConfiguracionPage() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: () => getConfig().then((r) => r.data),
  });

  const mut = useMutation({
    mutationFn: ({ clave, valor }) => updateConfig(clave, valor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
  });

  const bloqueo = config?.bloqueo_caja_produccion === "true";

  function toggleBloqueo() {
    mut.mutate({
      clave: "bloqueo_caja_produccion",
      valor: bloqueo ? "false" : "true",
    });
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <PageHeader
        title="Configuración"
        description="Ajustes de comportamiento del sistema"
      />

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Lock size={18} className="text-amber-700" />
            </div>
            <div>
              <p className="text-zinc-900 font-semibold mb-1">
                Bloqueo total en producción
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
                Cuando está activo, al empezar a escanear una caja la pantalla de
                producción queda bloqueada (no se puede cancelar, navegar ni
                salir) hasta terminar de escanearla por completo.
              </p>
            </div>
          </div>

          <button
            role="switch"
            aria-checked={bloqueo}
            onClick={toggleBloqueo}
            disabled={isLoading || mut.isPending}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
              bloqueo ? "bg-emerald-500" : "bg-zinc-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                bloqueo ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-zinc-200 flex items-center gap-2 text-xs">
          {mut.isPending ? (
            <span className="flex items-center gap-2 text-zinc-500">
              <Loader2 size={13} className="animate-spin" /> Guardando…
            </span>
          ) : bloqueo ? (
            <span className="flex items-center gap-2 text-emerald-700">
              <ShieldAlert size={13} /> Bloqueo activado
            </span>
          ) : (
            <span className="text-zinc-500">Bloqueo desactivado</span>
          )}
        </div>
      </div>

      {bloqueo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Con el bloqueo activo, un operador que inicie una caja deberá
            completarla. Si se queda atascado, un supervisor de la lista de
            abajo la libera desde Producción con su gafete. Para soltar todas
            las pantallas a la vez, desactiva este interruptor: se desbloquean
            solas en unos segundos.
          </p>
        </div>
      )}

      <SupervisoresPanel />
    </div>
  );
}
