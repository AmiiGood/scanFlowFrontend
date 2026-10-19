import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSkus, importSkus } from "@/api/skus";
import PageHeader from "@/components/layout/PageHeader";
import Paginator from "@/components/ui/Paginator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  XCircle,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { BotonPlantilla, RevisionSkus } from "@/components/admin/RevisionImportacion";

export default function SkusPage() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["skus", debouncedSearch, page],
    queryFn: () =>
      getSkus({ search: debouncedSearch, page, limit: 50 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const skus = data?.data || [];

  // Primero se revisa el archivo (nada se escribe); luego se confirma la carga.
  const [archivo, setArchivo] = useState(null);
  const [analisis, setAnalisis] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState(null);
  const falla = (e) => setError(e.response?.data?.error || "Error al leer el archivo");

  const validarMut = useMutation({
    mutationFn: (file) => importSkus(file, "validar"),
    onSuccess: (res) => setAnalisis(res.data),
    onError: falla,
  });
  const cargarMut = useMutation({
    mutationFn: () => importSkus(archivo, "cargar"),
    onSuccess: (res) => {
      setAnalisis(res.data);
      setCargado(true);
      qc.invalidateQueries(["skus"]);
    },
    onError: falla,
  });

  function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setArchivo(file);
    setAnalisis(null);
    setCargado(false);
    setError(null);
    validarMut.mutate(file);
  }

  function cerrarRevision() {
    setAnalisis(null);
    setArchivo(null);
    setCargado(false);
  }

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="SKUs"
        description={
          data
            ? `${data.total.toLocaleString()} productos en catálogo`
            : "Catálogo de productos"
        }
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            <BotonPlantilla href="/plantillas/plantilla_importar_SKUs.xlsx">Plantilla</BotonPlantilla>
            <Button
              size="sm"
              onClick={() => fileRef.current.click()}
              disabled={validarMut.isPending || cargarMut.isPending}
              className="bg-white text-zinc-950 hover:bg-zinc-100 gap-1.5"
            >
              <Upload size={14} />
              {validarMut.isPending ? "Revisando archivo..." : "Importar Excel"}
            </Button>
          </>
        }
      />

      {/* Revisión / resultado de la importación */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <XCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {analisis && (
        <RevisionSkus
          analisis={analisis}
          archivo={archivo?.name}
          cargado={cargado}
          cargando={cargarMut.isPending}
          onCargar={() => cargarMut.mutate()}
          onCerrar={cerrarRevision}
        />
      )}

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
        />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por SKU, UPC o nombre..."
          className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 h-9"
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                SKU
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                UPC
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Estilo
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Color
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Talla
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-600">
                  Cargando...
                </td>
              </tr>
            ) : skus.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-600">
                    <FileSpreadsheet size={24} />
                    <span className="text-sm">
                      {search
                        ? "Sin resultados"
                        : "Sin SKUs — importa un archivo Excel"}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              skus.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white font-mono text-xs">
                    {s.sku_number}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                    {s.upc}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.style_no}</td>
                  <td className="px-4 py-3 text-zinc-300">{s.style_name}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {s.color_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.size}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginator
        page={data?.page || 1}
        pages={data?.pages || 1}
        total={data?.total || 0}
        limit={50}
        onPage={setPage}
      />
    </div>
  );
}
