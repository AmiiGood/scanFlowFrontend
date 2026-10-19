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

// Exporta con tipos por columna. columnas = [{ titulo, valor: (fila) => …,
// tipo?: "fecha" | "hora", ancho? }]. Las fechas y horas llegan como texto
// "YYYY-MM-DD HH:MM:SS" (hora de planta) y se guardan como fecha/hora de Excel,
// así se pueden ordenar y filtrar.
export function exportConTipos(columnas, filas, filename, sheetName = "Reporte") {
  const ws = XLSX.utils.aoa_to_sheet([columnas.map((c) => c.titulo)]);
  filas.forEach((fila, i) => {
    columnas.forEach((col, j) => {
      const ref = XLSX.utils.encode_cell({ r: i + 1, c: j });
      const v = col.valor(fila);
      if (v == null || v === "") return;
      if (col.tipo === "fecha") {
        const [y, m, d] = v.slice(0, 10).split("-").map(Number);
        // Serial de Excel: días desde 1899-12-30.
        ws[ref] = { t: "n", v: Date.UTC(y, m - 1, d) / 86400000 + 25569, z: "dd/mm/yyyy" };
      } else if (col.tipo === "hora") {
        const [h, mi, s] = v.slice(11, 19).split(":").map(Number);
        ws[ref] = { t: "n", v: (h * 3600 + mi * 60 + s) / 86400, z: "hh:mm:ss AM/PM" };
      } else {
        ws[ref] = { t: typeof v === "number" ? "n" : "s", v };
      }
    });
  });
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: columnas.length - 1 } });
  ws["!cols"] = columnas.map((c) => ({ wch: c.ancho || 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `${filename}.xlsx`,
  );
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
