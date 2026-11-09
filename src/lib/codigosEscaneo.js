// Etiqueta de caja (mismo formato que valida el backend):
// codigoUnico$SKU$pares$secuencial. Sirve para distinguirla de un QR cuando el
// mismo campo acepta las dos cosas.
const CAJA_RE = /^\d+\$[A-Z0-9-]+\$\d+\$[A-Z]?\d+$/;

// El lector cambia el - según el teclado: ' o { con la PC en español, / con el
// lector en español y la PC en inglés.
export const normalizarCodigo = (codigo) => codigo.replace(/['{/]/g, "-").toUpperCase();

export const esEtiquetaCaja = (valor) => CAJA_RE.test(normalizarCodigo(valor.trim()));
