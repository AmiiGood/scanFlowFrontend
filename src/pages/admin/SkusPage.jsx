import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSkus, importSkus } from "@/api/skus";
import PageHeader from "@/components/layout/PageHeader";
import Paginator from "@/components/ui/Paginator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export default function SkusPage() {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [result, setResult] = useState(null);
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

  const importMut = useMutation({
    mutationFn: importSkus,
    onSuccess: (res) => {
      setResult(res.data);
      qc.invalidateQueries(["skus"]);
    },
    onError: (e) =>
      setResult({ error: e.response?.data?.error || "Error al importar" }),
  });

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setResult(null);
    importMut.mutate(file);
    e.target.value = "";
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
            <Button
              size="sm"
              onClick={() => fileRef.current.click()}
              disabled={importMut.isPending}
              className="bg-white text-zinc-950 hover:bg-zinc-100 gap-1.5"
            >
              <Upload size={14} />
              {importMut.isPending ? "Importando..." : "Importar Excel"}
            </Button>
          </>
        }
      />

      {/* Resultado importación */}
      {result && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${result.error ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-emerald-500/20 bg-emerald-500/5"}`}
        >
          {result.error ? (
            <div className="flex items-center gap-2">
              <XCircle size={14} />
              {result.error}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={14} />
                {result.inserted} insertados
              </div>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">
                {result.updated} actualizados
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">{result.total} total</span>
              {result.errors?.length > 0 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-red-400">
                    {result.errors.length} errores
                  </span>
                </>
              )}
            </div>
          )}
        </div>
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
