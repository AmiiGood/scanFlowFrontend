import { useState } from "react";
import { generateBackup } from "@/api/backup";
import PageHeader from "@/components/layout/PageHeader";
import { Database, Download, FileCode, HardDrive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function BackupPage() {
  const [loading, setLoading] = useState(null); // "full" | "schema" | null
  const [last, setLast] = useState(null); // { ok, filename, type }

  async function handleBackup(includeData) {
    const type = includeData ? "full" : "schema";
    setLoading(type);
    setLast(null);
    try {
      const res = await generateBackup(includeData);
      const cd = res.headers["content-disposition"] || "";
      const match = cd.match(/filename="(.+?)"/);
      const filename = match ? match[1] : `scanflow_backup_${type}.sql`;

      const url = URL.createObjectURL(new Blob([res.data], { type: "application/sql" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setLast({ ok: true, filename, type });
    } catch (err) {
      setLast({ ok: false, msg: err.response?.data?.error || "Error al generar backup", type });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <PageHeader
        title="Backup"
        description="Exporta la base de datos en formato SQL"
      />

      <div className="grid grid-cols-2 gap-4">
        {/* Backup completo */}
        <button
          onClick={() => handleBackup(true)}
          disabled={!!loading}
          className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 text-left hover:bg-white/[0.04] hover:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              {loading === "full"
                ? <Loader2 size={18} className="text-blue-400 animate-spin" />
                : <HardDrive size={18} className="text-blue-400" />
              }
            </div>
            <Download size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors mt-1" />
          </div>
          <p className="text-white font-semibold mb-1">Backup completo</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Estructura + todos los datos actuales. Incluye usuarios seed garantizados.
          </p>
        </button>

        {/* Solo estructura */}
        <button
          onClick={() => handleBackup(false)}
          disabled={!!loading}
          className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-6 text-left hover:bg-white/[0.04] hover:border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              {loading === "schema"
                ? <Loader2 size={18} className="text-violet-400 animate-spin" />
                : <FileCode size={18} className="text-violet-400" />
              }
            </div>
            <Download size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors mt-1" />
          </div>
          <p className="text-white font-semibold mb-1">Solo estructura</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            DDL de tablas sin datos. Útil para entornos nuevos. Incluye usuarios seed.
          </p>
        </button>
      </div>

      {/* Resultado */}
      {last && (
        <div className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${
          last.ok
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-red-500/20 bg-red-500/5"
        }`}>
          {last.ok
            ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            : <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          }
          <div>
            {last.ok ? (
              <>
                <p className="text-sm text-emerald-400 font-medium">Backup generado</p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{last.filename}</p>
              </>
            ) : (
              <p className="text-sm text-red-400">{last.msg}</p>
            )}
          </div>
        </div>
      )}

      {/* Info usuarios seed */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={13} className="text-zinc-500" />
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Usuarios garantizados en backup</p>
        </div>
        <div className="space-y-2">
          {[
            { email: "admin@foamcreations.mx", rol: "Administrador", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
            { email: "produccion@foamcreations.mx", rol: "Producción", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { email: "embarque@foamcreations.mx", rol: "Embarque", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          ].map((u) => (
            <div key={u.email} className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">{u.email}</span>
              <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${u.color}`}>{u.rol}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-700 mt-3">Contraseña: <span className="font-mono text-zinc-600">*FCMX2026</span></p>
      </div>
    </div>
  );
}
