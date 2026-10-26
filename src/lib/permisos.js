// Permisos de la sesión (vienen del perfil del usuario). El backend es el que
// protege de verdad; aquí solo se decide qué mostrar.
export const RESET = ["reset.caja", "reset.desasociar", "reset.carton", "reset.po"];
export const EMBARQUE = ["embarque.escanear", "embarque.musical_po"];
export const CONFIGURACION = ["config.editar", "supervisores.administrar"];

export const puede = (user, permiso) => !!user?.permisos?.includes(permiso);
export const puedeAlguno = (user, permisos) => [].concat(permisos).some((p) => puede(user, p));

// Pantalla con la que abre cada usuario, según lo primero que puede hacer.
const INICIO = [
  ["dashboard.ver", "/admin"],
  ["produccion.escanear", "/produccion"],
  [EMBARQUE, "/embarque"],
  ["pos.ver", "/admin/purchase-orders"],
  ["reportes.ver", "/admin/reportes"],
  [RESET, "/admin/reset"],
  ["usuarios.administrar", "/admin/usuarios"],
  ["skus.administrar", "/admin/skus"],
  ["qrs.importar", "/admin/qr-import"],
  [CONFIGURACION, "/admin/configuracion"],
  ["backup.generar", "/admin/backup"],
];

export function pantallaInicio(user) {
  const destino = INICIO.find(([permisos]) => puedeAlguno(user, permisos));
  return destino ? destino[1] : "/unauthorized";
}
