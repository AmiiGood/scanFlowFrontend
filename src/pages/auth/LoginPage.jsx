import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import crocsBg from "@/assets/crocs.jpg";

const CROCS_IMAGE = crocsBg;

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.rol === "operador_produccion") navigate("/produccion", { replace: true });
      else if (user.rol === "operador_embarque") navigate("/embarque", { replace: true });
      else navigate("/admin", { replace: true });
    }
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(email, password);
      if (u.rol === "operador_produccion") navigate("/produccion");
      else if (u.rol === "operador_embarque") navigate("/embarque");
      else navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo — imagen */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={CROCS_IMAGE}
          alt="Crocs"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay degradado */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/60 via-zinc-950/30 to-transparent" />

        {/* Texto sobre imagen */}
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="space-y-2">
            <p className="text-white/50 text-xs uppercase tracking-[0.2em] font-medium">
              Crocs Manufacturing
            </p>
            <h2 className="text-white text-3xl font-bold leading-tight">
              Control de calidad
              <br />
              en tiempo real
            </h2>
            <p className="text-white/60 text-sm max-w-xs">
              Validación de etiquetas QR para líneas de producción y embarque.
            </p>
          </div>
        </div>

        {/* Badge esquina superior */}
        <div className="absolute top-8 left-8 z-10">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 text-xs font-medium">
              Sistema activo
            </span>
          </div>
        </div>
      </div>

      {/* Lado derecho — formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-zinc-950 px-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-white"
                >
                  <rect
                    x="3"
                    y="3"
                    width="8"
                    height="8"
                    rx="1.5"
                    fill="currentColor"
                    opacity="0.9"
                  />
                  <rect
                    x="13"
                    y="3"
                    width="8"
                    height="8"
                    rx="1.5"
                    fill="currentColor"
                    opacity="0.4"
                  />
                  <rect
                    x="3"
                    y="13"
                    width="8"
                    height="8"
                    rx="1.5"
                    fill="currentColor"
                    opacity="0.4"
                  />
                  <rect
                    x="13"
                    y="13"
                    width="8"
                    height="8"
                    rx="1.5"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                ScanFlow
              </h1>
            </div>
            <p className="text-sm text-zinc-500">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-zinc-400 text-xs uppercase tracking-wider"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 h-11"
                placeholder="operador@empresa.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-zinc-400 text-xs uppercase tracking-wider"
              >
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-white/20 h-11"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-zinc-950 hover:bg-zinc-100 font-semibold h-11 mt-2"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-700">
            Crocs QR Validation System v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
