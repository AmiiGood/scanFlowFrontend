import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import {
  getDashboard,
  getProduccionPorDia,
  getResumenGeneral,
} from "@/api/reports";
import {
  BarraAvance,
  Estado,
  Kpi,
  PageTitle,
  Panel,
} from "@/components/reportes/kit";
import { GraficaBarras, Leyenda } from "@/components/reportes/graficas";
import { COLOR } from "@/components/reportes/estilos";
import { fmtFecha, fmtFechaHora, fmtHora, fmtNum } from "@/lib/formato";

// "2026-10-07" → "martes 7 de octubre", armando la fecha local a mano.
function diaLargo(fecha) {
  if (!fecha) return "";
  const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function comparacion(hoy, ayer) {
  hoy = Number(hoy);
  ayer = Number(ayer);
  if (!ayer) return { texto: "Sin lecturas ayer a esta hora", tono: "neutral" };
  const pct = Math.round(((hoy - ayer) / ayer) * 100);
  return {
    texto: `${pct >= 0 ? "+" : ""}${pct}% vs ayer a esta hora`,
    tono: pct >= 0 ? "up" : "down",
  };
}

export default function DashboardPage() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: porDia = [] } = useQuery({
    queryKey: ["reporte-produccion-dia", 14],
    queryFn: () => getProduccionPorDia(14).then((r) => r.data),
    refetchInterval: 5 * 60000,
  });

  // El inventario de QRs cuenta 1.3 M de filas: se pide poco.
  const { data: resumen } = useQuery({
    queryKey: ["resumen-general"],
    queryFn: () => getResumenGeneral().then((r) => r.data),
    staleTime: 5 * 60000,
    refetchInterval: 5 * 60000,
  });

  if (isLoading || !data) {
    return <div className="p-8 text-sm text-zinc-500">Cargando…</div>;
  }

  const { hoy, por_hora, incompletas, pos, actividad } = data;
  const comp = comparacion(hoy.pares_hoy, hoy.pares_ayer_misma_hora);

  // Solo las horas con producción hoy o en el promedio.
  const conDatos = por_hora.filter((h) => +h.hoy || +h.promedio);
  const horas = conDatos.length
    ? por_hora
        .filter((h) => h.hora >= conDatos[0].hora && h.hora <= conDatos.at(-1).hora)
        .map((h) => ({ hora: h.hora, hoy: +h.hoy, promedio: +h.promedio }))
    : [];

  const dias = [...porDia]
    .reverse()
    .map((d) => ({ fecha: d.fecha, abiertas: +d.cajas_abiertas, cerradas: +d.cajas_cerradas }));

  const qrs = resumen?.qrs;

  return (
    <div className="p-8 max-w-[1400px] space-y-5">
      <PageTitle
        title="Producción de hoy"
        description={
          <span className="first-letter:uppercase inline-block">
            {diaLargo(hoy.ahora)} · última lectura {fmtHora(hoy.ultima_lectura)}
          </span>
        }
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          label="Pares escaneados"
          value={fmtNum(hoy.pares_hoy)}
          hint={comp.texto}
          hintTone={comp.tono}
        />
        <Kpi
          label="Cajas cerradas"
          value={fmtNum(hoy.cajas_cerradas_hoy)}
          hint={`de ${fmtNum(hoy.cajas_abiertas_hoy)} abiertas hoy`}
        />
        <Kpi
          label="Cajas incompletas"
          value={fmtNum(incompletas.total)}
          hint={
            incompletas.total
              ? `${fmtNum(incompletas.falta_uno)} con un solo par faltante`
              : "Ninguna caja se quedó a medias"
          }
          tone={incompletas.total ? "alerta" : "normal"}
          hintTone={incompletas.total ? "alerta" : "neutral"}
        />
        <Kpi
          label="POs listas para T4"
          value={fmtNum(hoy.pos_listas)}
          hint={`${fmtNum(hoy.pos_en_proceso)} en proceso`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel
          className="xl:col-span-3"
          title="Pares por hora"
          subtitle="Hoy contra el promedio de los últimos 14 días con producción"
          actions={
            <Leyenda
              items={[
                { label: "Hoy", color: COLOR.principal },
                { label: "Promedio", color: COLOR.referencia, linea: true },
              ]}
            />
          }
        >
          {horas.length ? (
            <GraficaBarras
              data={horas}
              x="hora"
              barras={[{ key: "hoy", label: "Hoy", color: COLOR.principal }]}
              linea={{ key: "promedio", label: "Promedio" }}
              etiquetaX={(h) => `${String(h).padStart(2, "0")}:00`}
            />
          ) : (
            <p className="py-16 text-center text-sm text-zinc-500">Todavía no hay lecturas</p>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Cajas abiertas y cerradas"
          subtitle="Últimos 14 días"
          actions={
            <Leyenda
              items={[
                { label: "Abiertas", color: COLOR.claro },
                { label: "Cerradas", color: COLOR.principal },
              ]}
            />
          }
        >
          <GraficaBarras
            data={dias}
            x="fecha"
            barras={[
              { key: "abiertas", label: "Abiertas", color: COLOR.claro },
              { key: "cerradas", label: "Cerradas", color: COLOR.principal },
            ]}
            etiquetaX={(f) => fmtFecha(f).slice(0, 5)}
            etiquetaGlobo={fmtFecha}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel
          className="xl:col-span-3"
          title="Avance de POs"
          subtitle="Primero las listas para enviar a T4, luego por avance"
          actions={
            <Link to="/admin/reportes?tab=pendientes" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
              Cartones pendientes <ArrowRight size={12} />
            </Link>
          }
        >
          {pos.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No hay POs en proceso</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {pos.map((po) => {
                const pct = Math.round((po.cartones_completos / po.total_cartones) * 100);
                return (
                  <li key={po.id} className="grid grid-cols-[110px_96px_minmax(0,1fr)_130px] items-center gap-4 py-2.5">
                    <span className="font-mono text-xs text-zinc-900">{po.po_number}</span>
                    <Estado valor={po.estado} />
                    <BarraAvance valor={+po.cartones_completos} total={+po.total_cartones} />
                    <span className="text-xs text-zinc-500 text-right tabular-nums">
                      {fmtNum(po.cartones_completos)}/{fmtNum(po.total_cartones)} cartones · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title="Cajas incompletas"
          subtitle="Abiertas y sin lecturas en los últimos 10 minutos"
          actions={
            incompletas.total > 0 && (
              <Link to="/admin/reportes?tab=detalle-cajas" className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
                Ver detalle <ArrowRight size={12} />
              </Link>
            )
          }
        >
          {incompletas.total === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Ninguna caja se quedó a medias</p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-100">
                {incompletas.cajas.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-zinc-900 truncate">{c.codigo_caja}</p>
                      <p className="text-xs text-zinc-500">Última lectura {fmtFechaHora(c.ultima_lectura)}</p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                      {c.escaneados}/{c.cantidad_pares}
                    </span>
                  </li>
                ))}
              </ul>
              {incompletas.total > incompletas.cajas.length && (
                <p className="pt-3 text-xs text-zinc-500">
                  y {fmtNum(incompletas.total - incompletas.cajas.length)} más
                </p>
              )}
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Panel className="xl:col-span-2" title="Inventario de códigos QR" subtitle="Se actualiza cada 5 minutos">
          {!qrs ? (
            <p className="py-8 text-center text-sm text-zinc-500">Cargando…</p>
          ) : (
            <div className="space-y-4">
              <div className="flex h-3 rounded-full overflow-hidden bg-zinc-100">
                {[
                  ["disponibles", "#d4d4d8"],
                  ["escaneados", COLOR.principal],
                  ["enviados", "#7c3aed"],
                ].map(([k, color]) => (
                  <div key={k} style={{ width: `${(qrs[k] / qrs.total) * 100}%`, background: color }} />
                ))}
              </div>
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ["Disponibles", qrs.disponibles, "#d4d4d8"],
                  ["Escaneados", qrs.escaneados, COLOR.principal],
                  ["Enviados a T4", qrs.enviados, "#7c3aed"],
                ].map(([label, n, color]) => (
                  <div key={label}>
                    <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                      {label}
                    </dt>
                    <dd className="text-lg font-semibold text-zinc-900 tabular-nums">{fmtNum(n)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-3" title="Últimas lecturas" flush>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {actividad.map((a, i) => (
              <li key={i} className="grid grid-cols-[52px_minmax(0,1fr)_150px] items-center gap-4 px-5 py-2">
                <span className="text-xs text-zinc-500 tabular-nums">{fmtHora(a.fecha_hora)}</span>
                <span className="font-mono text-xs text-zinc-900 truncate" title={a.codigo_qr}>
                  {a.codigo_caja || "Embarque"}
                </span>
                <span className="text-xs text-zinc-500 truncate text-right">{a.sku_number}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
