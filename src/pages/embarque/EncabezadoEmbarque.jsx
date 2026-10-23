// Encabezado de Embarque con el selector de modo: por cartón (escaneando el
// carton ID) o musicales por PO (escribiendo la PO, según el SOP).
const MODOS_EMBARQUE = [
  { id: "carton", label: "Por cartón" },
  { id: "musical-po", label: "🎵 Musical por PO" },
];

export function SelectorModo({ modo, onCambiar }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
      {MODOS_EMBARQUE.map((m) => (
        <button
          key={m.id}
          onClick={() => onCambiar(m.id)}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
            modo === m.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function EncabezadoEmbarque({ selector, children }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.9" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.4" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.4" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.9" />
          </svg>
        </div>
        <span className="font-bold text-gray-900">ScanFlow</span>
        <span className="text-gray-200">|</span>
        <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Embarque</span>
        {selector && <div className="ml-3">{selector}</div>}
      </div>
      {children}
    </div>
  );
}
