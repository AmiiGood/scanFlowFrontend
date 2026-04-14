import { useQuery } from '@tanstack/react-query'
import { getResumenGeneral, getActividadReciente, getProduccionPorOperador } from '@/api/reports'
import PageHeader from '@/components/layout/PageHeader'
import { useNavigate } from 'react-router-dom'
import {
  Package, QrCode, Truck, Users,
  CheckCircle2, Clock, Send, XCircle,
  TrendingUp, Activity,
} from 'lucide-react'

function StatCard({ label, value, sub, color = 'text-white', icon: Icon, iconColor }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
        {Icon && <Icon size={14} className={iconColor || 'text-zinc-600'} />}
      </div>
      <p className={`text-3xl font-bold ${color} tabular-nums`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: resumen, isLoading } = useQuery({
    queryKey: ['resumen-general'],
    queryFn: () => getResumenGeneral().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: actividad = [] } = useQuery({
    queryKey: ['actividad-reciente'],
    queryFn: () => getActividadReciente(20).then((r) => r.data),
    refetchInterval: 15000,
  })

  const { data: operadores = [] } = useQuery({
    queryKey: ['produccion-operadores'],
    queryFn: () => getProduccionPorOperador().then((r) => r.data),
  })

  if (isLoading) {
    return <div className="p-8 text-zinc-600">Cargando...</div>
  }

  const po = resumen?.purchase_orders
  const cartones = resumen?.cartones
  const cajas = resumen?.cajas
  const qrs = resumen?.qrs

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema"
      />

      {/* Purchase Orders */}
      <section>
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
          <Send size={12} /> Purchase Orders
        </h2>
        <div className="grid grid-cols-5 gap-3">
          <StatCard label="Total POs" value={po?.total || 0} icon={TrendingUp} />
          <StatCard label="Pendientes" value={po?.pendientes || 0} color="text-zinc-400" icon={Clock} iconColor="text-zinc-600" />
          <StatCard label="En proceso" value={po?.en_proceso || 0} color="text-blue-400" icon={Activity} iconColor="text-blue-600" />
          <StatCard label="Enviadas" value={po?.enviadas || 0} color="text-violet-400" icon={Send} iconColor="text-violet-600" />
          <StatCard label="Canceladas" value={po?.canceladas || 0} color="text-red-400" icon={XCircle} iconColor="text-red-600" />
        </div>
      </section>

      {/* Cartones + Cajas */}
      <section className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
            <Package size={12} /> Cartones
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total" value={cartones?.total || 0} />
            <StatCard label="Completos" value={cartones?.completos || 0} color="text-emerald-400" icon={CheckCircle2} iconColor="text-emerald-600" />
            <StatCard label="Pendientes" value={cartones?.pendientes || 0} color="text-zinc-400" icon={Clock} iconColor="text-zinc-600" />
          </div>
        </div>
        <div>
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
            <Truck size={12} /> Cajas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Abiertas" value={cajas?.abiertas || 0} color="text-blue-400" />
            <StatCard label="Empacadas" value={cajas?.empacadas || 0} color="text-emerald-400" />
          </div>
        </div>
      </section>

      {/* QRs */}
      <section>
        <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
          <QrCode size={12} /> Códigos QR
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total" value={Number(qrs?.total || 0).toLocaleString()} />
          <StatCard label="Disponibles" value={Number(qrs?.disponibles || 0).toLocaleString()} color="text-emerald-400" />
          <StatCard label="Escaneados" value={Number(qrs?.escaneados || 0).toLocaleString()} color="text-blue-400" />
          <StatCard label="Enviados" value={Number(qrs?.enviados || 0).toLocaleString()} color="text-violet-400" />
        </div>

        {/* Barra visual QRs */}
        {qrs?.total > 0 && (
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3">
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(qrs.disponibles / qrs.total) * 100}%` }} />
              <div className="bg-blue-500 transition-all" style={{ width: `${(qrs.escaneados / qrs.total) * 100}%` }} />
              <div className="bg-violet-500 transition-all" style={{ width: `${(qrs.enviados / qrs.total) * 100}%` }} />
            </div>
            <div className="flex items-center gap-4 mt-2">
              {[
                { label: 'Disponibles', color: 'bg-emerald-500' },
                { label: 'Escaneados', color: 'bg-blue-500' },
                { label: 'Enviados', color: 'bg-violet-500' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs text-zinc-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Bottom grid — actividad + operadores */}
      <div className="grid grid-cols-2 gap-6">

        {/* Actividad reciente */}
        <div>
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
            <Activity size={12} /> Actividad reciente
          </h2>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            {actividad.length === 0 ? (
              <p className="px-4 py-6 text-xs text-zinc-700 text-center">Sin actividad reciente</p>
            ) : (
              <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                {actividad.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-medium">{a.operador?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 truncate font-mono">{a.codigo_qr}</p>
                      <p className="text-xs text-zinc-600">{a.operador} · {a.sku_number}</p>
                    </div>
                    <span className="text-xs text-zinc-700 shrink-0">
                      {new Date(a.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Producción por operador */}
        <div>
          <h2 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
            <Users size={12} /> Operadores
          </h2>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            {operadores.length === 0 ? (
              <p className="px-4 py-6 text-xs text-zinc-700 text-center">Sin datos de operadores</p>
            ) : (
              <div className="divide-y divide-white/5">
                {operadores.map((op) => (
                  <div key={op.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-medium">{op.nombre?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 font-medium truncate">{op.nombre}</p>
                      <p className="text-xs text-zinc-600">{op.cajas_iniciadas} cajas · {Number(op.qrs_escaneados).toLocaleString()} QRs</p>
                    </div>
                    {op.ultimo_escaneo && (
                      <span className="text-xs text-zinc-700 shrink-0">
                        {new Date(op.ultimo_escaneo).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}