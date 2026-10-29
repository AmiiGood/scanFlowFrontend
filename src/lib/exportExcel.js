import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportToExcel(data, filename, sheetName = "Reporte") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `${filename}.xlsx`,
  );
}

// Excel que ya viene armado del servidor.
export function guardarExcel(blob, filename) {
  saveAs(blob, `${filename}.xlsx`);
}

// Mensaje de un error al exportar. En las descargas el error del servidor
// llega como Blob y hay que leerlo.
export async function mensajeDeError(err, porDefecto = "No se pudo exportar. Intenta de nuevo") {
  let datos = err?.response?.data;
  if (datos instanceof Blob) {
    try {
      datos = JSON.parse(await datos.text());
    } catch {
      datos = null;
    }
  }
  if (datos?.error) return datos.error;
  if (!err?.response) return "Se perdió la conexión con el servidor mientras se exportaba";
  return porDefecto;
}

export function exportMultiSheet(sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ data, name }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `${filename}.xlsx`,
  );
}

// Plantilla de carga de SKUs con los ArSKU que faltan ya puestos (el UPC y el
// nombre del estilo se capturan a mano). Todo como texto, igual que la plantilla.
export function descargarPlantillaSkus(faltantes, filename = "skus-faltantes") {
  const filas = [
    ["ArSKU", "UPC", "StyleNo", "StyleName", "Size", "Color", "ColorName"],
    ...faltantes.map((f) => [f.sku, "", f.style_no || "", "", f.size || "", f.sku.split("-")[1] || "", ""]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  for (let r = 1; r <= faltantes.length; r++)
    for (let c = 0; c < 7; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      ws[ref].z = "@";
    }
  ws["!cols"] = [22, 16, 11, 26, 10, 9, 18].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SKUs");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${filename}.xlsx`);
}
