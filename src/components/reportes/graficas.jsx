// Gráficas del tema claro (Recharts); la paleta vive en estilos.js.
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLOR } from "./estilos";

const fmt = (n) => Number(n || 0).toLocaleString("es-MX");

function Globo({ active, payload, label, etiqueta }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-zinc-900 mb-1">{etiqueta ? etiqueta(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-zinc-600">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-zinc-900 tabular-nums">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function Leyenda({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map(({ label, color, linea }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-zinc-600">
          {linea ? (
            <span className="inline-block w-3 border-t-2 border-dashed" style={{ borderColor: color }} />
          ) : (
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
          )}
          {label}
        </span>
      ))}
    </div>
  );
}

// Barras (una o varias series lado a lado) con una línea de referencia opcional.
export function GraficaBarras({
  data,
  x,
  barras,
  linea,
  alto = 220,
  etiquetaX,
  etiquetaGlobo,
}) {
  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }} barGap={2}>
          <CartesianGrid vertical={false} stroke={COLOR.rejilla} />
          <XAxis
            dataKey={x}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: COLOR.eje }}
            tickFormatter={etiquetaX}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: COLOR.eje }}
            tickFormatter={fmt}
            width={48}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "#f4f4f5" }}
            content={<Globo etiqueta={etiquetaGlobo || etiquetaX} />}
          />
          {barras.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={b.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            />
          ))}
          {linea && (
            <Line
              dataKey={linea.key}
              name={linea.label}
              stroke={linea.color || COLOR.referencia}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              type="monotone"
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
