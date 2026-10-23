// Etiqueta de caja (mismo formato que valida el backend):
// codigoUnico$SKU$pares$secuencial. Sirve para distinguirla de un QR cuando el
// mismo campo acepta las dos cosas.
const CAJA_RE = /^\d+\$[A-Z0-9-]+\$\d+\$[A-Z]?\d+$/;

// El lector con teclado en español cambia - por ' o {.
export const normalizarCodigo = (codigo) => codigo.replace(/['{]/g, "-").toUpperCase();

export const esEtiquetaCaja = (valor) => CAJA_RE.test(normalizarCodigo(valor.trim()));
