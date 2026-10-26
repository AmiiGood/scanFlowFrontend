// Perfiles: cada uno es un conjunto de permisos y cada usuario tiene uno.
// Los cinco perfiles base (los roles de antes) se pueden editar, pero no
// borrar; el Administrador siempre tiene todo y no se edita.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { actualizarPerfil, crearPerfil, eliminarPerfil, getCatalogoPermisos, getPerfiles } from "@/api/perfiles";

const VACIO = { id: null, nombre: "", descripcion: "", permisos: [] };

function EditorPerfil({ perfil, catalogo, onCerrar }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(perfil);
  const [error, setError] = useState("");
  const marcados = new Set(form.permisos);

  const guardar = useMutation({
    mutationFn: () => {
      const datos = { nombre: form.nombre, descripcion: form.descripcion, permisos: form.permisos };
      return form.id ? actualizarPerfil(form.id, datos) : crearPerfil(datos);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfiles"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["sesion"] });
      onCerrar();
    },
    onError: (e) => setError(e.response?.data?.error || "No se pudo guardar el perfil"),
  });

  function alternar(clave) {
    const nuevos = new Set(marcados);
    if (nuevos.has(clave)) nuevos.delete(clave);
    else nuevos.add(clave);
    setForm({ ...form, permisos: [...nuevos] });
  }

  function alternarGrupo(grupo) {
    const claves = grupo.permisos.map((p) => p.clave);
    const todos = claves.every((c) => marcados.has(c));
    const nuevos = new Set(marcados);
    claves.forEach((c) => (todos ? nuevos.delete(c) : nuevos.add(c)));
    setForm({ ...form, permisos: [...nuevos] });
  }

  return (
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-zinc-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="perfil-titulo" className="m-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-zinc-100">
          <h2 id="perfil-titulo" className="text-lg font-semibold text-zinc-900">
            {form.id ? `Editar perfil` : "Nuevo perfil"}
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Nombre</span>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Supervisor de reset"
                maxLength={80}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Descripción (opcional)</span>
              <input
                value={form.descripcion || ""}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                maxLength={300}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </label>
          </div>

          <div className="space-y-4">
            {catalogo.map((grupo) => {
              const todos = grupo.permisos.every((p) => marcados.has(p.clave));
              return (
                <fieldset key={grupo.grupo} className="rounded-xl border border-zinc-200">
                  <legend className="sr-only">{grupo.grupo}</legend>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 bg-zinc-50 rounded-t-xl">
                    <span className="text-sm font-semibold text-zinc-900">{grupo.grupo}</span>
                    <button type="button" onClick={() => alternarGrupo(grupo)} className="text-xs font-medium text-blue-700 hover:underline">
                      {todos ? "Quitar todos" : "Marcar todos"}
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {grupo.permisos.map((p) => (
                      <label key={p.clave} className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          checked={marcados.has(p.clave)}
                          onChange={() => alternar(p.clave)}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-blue-600"
                        />
                        <span>
                          <span className="block text-sm text-zinc-900">{p.nombre}</span>
                          {p.ayuda && <span className="block text-xs text-zinc-500">{p.ayuda}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>

          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 pb-5">
          <span className="text-xs text-zinc-500">
            {form.permisos.length} {form.permisos.length === 1 ? "permiso" : "permisos"}
          </span>
          <div className="flex gap-2">
            <button onClick={onCerrar} className="h-10 px-4 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Cancelar
            </button>
            <button
              onClick={() => guardar.mutate()}
              disabled={!form.nombre.trim() || guardar.isPending}
              className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none"
            >
              {guardar.isPending ? "Guardando…" : "Guardar perfil"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerfilesPanel() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");

  const { data: perfiles = [], isLoading } = useQuery({
    queryKey: ["perfiles"],
    queryFn: () => getPerfiles().then((r) => r.data),
  });
  const { data: catalogo = [] } = useQuery({
    queryKey: ["catalogo-permisos"],
    queryFn: () => getCatalogoPermisos().then((r) => r.data),
    staleTime: Infinity,
  });
  const nombres = Object.fromEntries(catalogo.flatMap((g) => g.permisos.map((p) => [p.clave, p.nombre])));

  const borrar = useMutation({
    mutationFn: (id) => eliminarPerfil(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perfiles"] }),
    onError: (e) => setError(e.response?.data?.error || "No se pudo eliminar el perfil"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-zinc-500 max-w-xl flex-1 min-w-[240px]">
          Cada usuario tiene un perfil y el perfil decide qué secciones ve y qué puede hacer. Un cambio aquí aplica a todos
          los usuarios del perfil en un par de minutos, sin que tengan que volver a entrar.
        </p>
        <button
          onClick={() => setEditando(VACIO)}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={14} /> Nuevo perfil
        </button>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}

      <div className="grid md:grid-cols-2 gap-3">
        {isLoading ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : (
          perfiles.map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                    {p.sistema ? <ShieldCheck size={14} className="text-violet-700" /> : null}
                    {p.nombre}
                  </p>
                  {p.descripcion && <p className="text-xs text-zinc-500 mt-0.5">{p.descripcion}</p>}
                </div>
                <span className="shrink-0 text-xs text-zinc-500">
                  {p.usuarios} {p.usuarios === 1 ? "usuario" : "usuarios"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.sistema ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border bg-violet-50 text-violet-700 border-violet-200">
                    <Check size={11} /> Todos los permisos
                  </span>
                ) : p.permisos.length === 0 ? (
                  <span className="text-xs text-zinc-500">Sin permisos</span>
                ) : (
                  p.permisos.map((k) => (
                    <span key={k} className="text-xs px-2 py-0.5 rounded-md border bg-zinc-50 text-zinc-700 border-zinc-200">
                      {nombres[k] || k}
                    </span>
                  ))
                )}
              </div>

              <div className="flex gap-2 mt-auto">
                {p.sistema ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    <Lock size={12} /> No se edita
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setError("");
                        setEditando({ id: p.id, nombre: p.nombre, descripcion: p.descripcion || "", permisos: p.permisos });
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                    {!p.clave && (
                      <button
                        onClick={() => {
                          setError("");
                          if (window.confirm(`¿Eliminar el perfil «${p.nombre}»?`)) borrar.mutate(p.id);
                        }}
                        disabled={p.usuarios > 0}
                        title={p.usuarios > 0 ? "Cambia a sus usuarios de perfil antes de eliminarlo" : undefined}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editando && <EditorPerfil perfil={editando} catalogo={catalogo} onCerrar={() => setEditando(null)} />}
    </div>
  );
}
