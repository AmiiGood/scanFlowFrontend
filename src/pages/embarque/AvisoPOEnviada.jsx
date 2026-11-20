import { Send } from "lucide-react";
import { fmtFecha } from "@/lib/formato";

// Una PO que ya se envió a Trysor se puede seguir llenando, pero lo que se
// escanee no llega a Trysor hasta que se mande como complemento.
export default function AvisoPOEnviada({ po }) {
  if (po?.estado !== "enviado") return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 border-b-2 border-amber-300 px-5 py-3 text-amber-900">
      <Send size={18} className="shrink-0 mt-0.5 text-amber-600" />
      <div>
        <p className="text-sm font-bold">
          Esta PO ya se envió a Trysor{po.cfm_xf_date ? ` (XF ${fmtFecha(po.cfm_xf_date)})` : ""}
        </p>
        <p className="text-xs mt-0.5">
          Puedes seguir escaneando, pero estos pares quedan pendientes de mandar. Avisa a quien hace los envíos.
        </p>
      </div>
    </div>
  );
}
