import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQrStats, importQRs, getJobStatus, getRecentJobs } from "@/api/qr";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  CheckCircle2,
  XCircle,
  QrCode,
  RefreshCw,
  Clock,
  Loader2,
} from "lucide-react";

const ESTADO_JOB = {
  pendiente: {
    color: "text-zinc-400",
    bg: "bg-zinc-500/10 border-zinc-500/20",
    icon: Clock,
  },
  procesando: {
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: Loader2,
  },
  completado: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  error: {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
};

function JobCard({ job }) {
  const cfg = ESTADO_JOB[job.estado] || ESTADO_JOB.pendiente;
  const Icon = cfg.icon;
  const duracion =
    job.started_at && job.finished_at
      ? Math.round(
          (new Date(job.finished_at) - new Date(job.started_at)) / 1000,
        )
      : null;

  return (
    <div className={`rounded-xl border px-4 py-3 ${cfg.bg}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon
          size={14}
          className={`${cfg.color} ${job.estado === "procesando" ? "animate-spin" : ""}`}
        />
        <span className={`text-sm font-medium ${cfg.color}`}>{job.estado}</span>
        <span className="text-zinc-600 text-xs ml-auto">
          {new Date(job.created_at).toLocaleString("es-MX")}
        </span>
      </div>

      {job.estado === "procesando" && (
        <p className="text-xs text-zinc-500">
          Consultando API Trysor e insertando registros... esto puede tardar
          varios minutos.
        </p>
      )}

      {job.estado === "completado" && job.resultado && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: "Recibidos", value: job.resultado.total_api },
            {
              label: "Insertados",
              value: job.resultado.inserted,
              color: "text-emerald-400",
            },
            { label: "Ya existían", value: job.resultado.skipped },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-xs text-zinc-600">{label}</p>
              <p className={`text-base font-semibold ${color || "text-white"}`}>
                {Number(value || 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {job.estado === "error" && (
        <p className="text-xs text-red-400 mt-1">{job.error}</p>
      )}

      {duracion !== null && (
        <p className="text-xs text-zinc-600 mt-2">Duración: {duracion}s</p>
      )}
    </div>
  );
}

export default function QRImportPage() {
  const [lastGetTime, setLastGetTime] = useState("2000-01-01 00:00:00");
  const [activeJobId, setActiveJobId] = useState(null);
  const pollingRef = useRef(null);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["qr-stats"],
    queryFn: () => getQrStats().then((r) => r.data),
  });

  const { data: recentJobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ["qr-jobs"],
    queryFn: () => getRecentJobs().then((r) => r.data),
  });

  const importMut = useMutation({
    mutationFn: () => importQRs(lastGetTime),
    onSuccess: (res) => {
      setActiveJobId(res.data.job_id);
      refetchJobs();
    },
  });

  // Polling del job activo
  useEffect(() => {
    if (!activeJobId) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getJobStatus(activeJobId);
        const job = res.data;
        if (job.estado === "completado" || job.estado === "error") {
          clearInterval(pollingRef.current);
          setActiveJobId(null);
          refetchJobs();
          refetchStats();
        }
      } catch {
        clearInterval(pollingRef.current);
        setActiveJobId(null);
      }
    }, 5000); // polling cada 5 segundos

    return () => clearInterval(pollingRef.current);
  }, [activeJobId]);

  const isRunning = !!activeJobId || importMut.isPending;

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader
        title="Importar QRs"
        description="Sincronización de códigos QR desde API Trysor"
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total", value: stats?.total || 0, color: "text-white" },
          {
            label: "Disponibles",
            value: stats?.disponibles || 0,
            color: "text-emerald-400",
          },
          {
            label: "Escaneados",
            value: stats?.escaneados || 0,
            color: "text-blue-400",
          },
          {
            label: "Enviados",
            value: stats?.enviados || 0,
            color: "text-violet-400",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
          >
            <p className="text-xs text-zinc-600 mb-1">{label}</p>
            <p className={`text-xl font-semibold ${color}`}>
              {Number(value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Configuración */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 mb-6 space-y-4">
        <h2 className="text-sm font-medium text-zinc-300">Nueva importación</h2>
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider">
            Traer QRs desde fecha (LastGetTime)
          </Label>
          <Input
            value={lastGetTime}
            onChange={(e) => setLastGetTime(e.target.value)}
            disabled={isRunning}
            placeholder="2000-01-01 00:00:00"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 h-9 max-w-xs font-mono text-sm"
          />
          <p className="text-xs text-zinc-600">
            Usa <span className="font-mono">2000-01-01 00:00:00</span> para
            traer todos. Para importaciones incrementales usa la fecha del
            último import.
          </p>
        </div>

        <Button
          onClick={() => importMut.mutate()}
          disabled={isRunning}
          className="bg-white text-zinc-950 hover:bg-zinc-100 gap-1.5"
        >
          {isRunning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Importando en background...
            </>
          ) : (
            <>
              <Download size={14} />
              Iniciar importación
            </>
          )}
        </Button>

        {isRunning && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
            <Loader2 size={12} className="animate-spin text-blue-400" />
            Proceso corriendo en el servidor. Puedes cerrar esta página — el
            proceso continuará. Actualizando cada 5 segundos...
          </div>
        )}
      </div>

      {/* Historial de jobs */}
      {recentJobs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-400">
              Historial de importaciones
            </h2>
            <button
              onClick={refetchJobs}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {recentJobs.length === 0 && !isRunning && (
        <div className="flex flex-col items-center gap-3 py-12 text-zinc-700">
          <QrCode size={32} />
          <p className="text-sm">Sin importaciones previas</p>
        </div>
      )}
    </div>
  );
}
