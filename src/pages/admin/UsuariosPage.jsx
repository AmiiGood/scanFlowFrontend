import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, createUser, updateUser, changePassword } from "@/api/users";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Pencil,
  KeyRound,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const ROL_LABELS = {
  superadmin: "Administrador",
  operador_produccion: "Producción",
  operador_embarque: "Embarque",
};

const ROL_COLORS = {
  superadmin: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  operador_produccion: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  operador_embarque: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const EMPTY_FORM = {
  nombre: "",
  email: "",
  password: "",
  rol: "operador_produccion",
};

export default function UsuariosPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [passModal, setPassModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newPass, setNewPass] = useState("");
  const [formError, setFormError] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries(["users"]);
      closeModal();
    },
    onError: (e) =>
      setFormError(e.response?.data?.error || "Error al crear usuario"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries(["users"]);
      closeModal();
    },
    onError: (e) =>
      setFormError(e.response?.data?.error || "Error al actualizar"),
  });

  const passMut = useMutation({
    mutationFn: ({ id, password }) => changePassword(id, password),
    onSuccess: () => {
      setPassModal(false);
      setNewPass("");
    },
    onError: (e) =>
      setFormError(e.response?.data?.error || "Error al cambiar password"),
  });

  const toggleActivoMut = useMutation({
    mutationFn: ({ id, activo }) => updateUser(id, { activo }),
    onSuccess: () => qc.invalidateQueries(["users"]),
  });

  function openCreate() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(user) {
    setSelected(user);
    setForm({
      nombre: user.nombre,
      email: user.email,
      password: "",
      rol: user.rol,
    });
    setFormError("");
    setModalOpen(true);
  }

  function openPass(user) {
    setSelected(user);
    setNewPass("");
    setFormError("");
    setPassModal(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (selected) {
      const data = { nombre: form.nombre, email: form.email, rol: form.rol };
      updateMut.mutate({ id: selected.id, data });
    } else {
      createMut.mutate(form);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-8">
      <PageHeader
        title="Usuarios"
        description="Gestión de acceso al sistema"
        actions={
          <Button
            onClick={openCreate}
            size="sm"
            className="bg-white text-zinc-950 hover:bg-zinc-100 gap-1.5"
          >
            <UserPlus size={14} />
            Nuevo usuario
          </Button>
        }
      />

      {/* Tabla */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Email
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Rol
              </th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">
                Estado
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  Cargando...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  No hay usuarios registrados
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-medium">
                          {u.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white font-medium">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${ROL_COLORS[u.rol]}`}
                    >
                      {ROL_LABELS[u.rol]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleActivoMut.mutate({ id: u.id, activo: !u.activo })
                      }
                      className="flex items-center gap-1.5 text-xs transition-colors"
                    >
                      {u.activo ? (
                        <>
                          <CheckCircle2
                            size={14}
                            className="text-emerald-400"
                          />
                          <span className="text-emerald-400">Activo</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} className="text-zinc-600" />
                          <span className="text-zinc-600">Inactivo</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => openPass(u)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                      >
                        <KeyRound size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selected ? "Editar usuario" : "Nuevo usuario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                Nombre
              </Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20"
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20"
                placeholder="correo@empresa.com"
              />
            </div>
            {!selected && (
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                Rol
              </Label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="operador_produccion" className="bg-zinc-900">
                  Producción
                </option>
                <option value="operador_embarque" className="bg-zinc-900">
                  Embarque
                </option>
                <option value="superadmin" className="bg-zinc-900">
                  Administrador
                </option>
              </select>
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                className="flex-1 text-zinc-400 hover:text-white border border-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-white text-zinc-950 hover:bg-zinc-100"
              >
                {isPending
                  ? "Guardando..."
                  : selected
                    ? "Guardar cambios"
                    : "Crear usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal cambiar password */}
      <Dialog open={passModal} onOpenChange={setPassModal}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-zinc-500">
              Usuario: <span className="text-white">{selected?.nombre}</span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                Nueva contraseña
              </Label>
              <Input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setPassModal(false)}
                className="flex-1 text-zinc-400 hover:text-white border border-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  passMut.mutate({ id: selected.id, password: newPass })
                }
                disabled={passMut.isPending || !newPass}
                className="flex-1 bg-white text-zinc-950 hover:bg-zinc-100"
              >
                {passMut.isPending ? "Guardando..." : "Cambiar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
