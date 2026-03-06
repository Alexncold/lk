const form = document.getElementById("upload-form");
const pdfInput = document.getElementById("pdf-file");
const outputFormat = document.getElementById("output-format");
const csvDelimiter = document.getElementById("csv-delimiter");
const downloadBtn = document.getElementById("download-btn");
const removeEmptyColsBtn = document.getElementById("remove-empty-cols");
const tableWrap = document.getElementById("table-wrap");
const statusBox = document.getElementById("status");
const progressSection = document.getElementById("progress-section");
const progressBar = document.getElementById("progress-bar");

let columns = [];
let rows = [];

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function showStatus(message, type = "info") {
  statusBox.className = `alert alert-${type} mt-4`;
  statusBox.textContent = message;
}

function setProgress(value) {
  const safeValue = Math.max(0, Math.min(100, value));
  progressBar.style.width = `${safeValue}%`;
  progressBar.textContent = `${safeValue}%`;
}

function startProgress() {
  progressSection.classList.remove("d-none");
  setProgress(0);
}

function finishProgress() {
  setProgress(100);
  setTimeout(() => {
    progressSection.classList.add("d-none");
    setProgress(0);
  }, 500);
}

function buildRowsFromTextItems(items) {
  const lineMap = new Map();

  items.forEach((item) => {
    const text = String(item.str || "").trim();
    if (!text) {
      return;
    }

    const x = item.transform?.[4] || 0;
    const y = item.transform?.[5] || 0;
    const width = item.width || Math.max(8, text.length * 4);
    const lineBucket = Math.round(y / 2) * 2;

    if (!lineMap.has(lineBucket)) {
      lineMap.set(lineBucket, []);
    }

    lineMap.get(lineBucket).push({ text, x, width });
  });

  const sortedLines = Array.from(lineMap.entries()).sort((a, b) => b[0] - a[0]);

  return sortedLines
    .map(([, lineItems]) => {
      lineItems.sort((a, b) => a.x - b.x);

      const cells = [];
      let current = "";
      let lastEnd = null;

      lineItems.forEach((token) => {
        const gap = lastEnd === null ? 0 : token.x - lastEnd;
        if (lastEnd !== null && gap > 26) {
          cells.push(current.trim());
          current = token.text;
        } else {
          current = current ? `${current} ${token.text}` : token.text;
        }
        lastEnd = token.x + token.width;
      });

      if (current.trim()) {
        cells.push(current.trim());
      }

      return cells;
    })
    .filter((row) => row.length > 0);
}

function normalizeToTable(rawRows) {
  const nonEmpty = rawRows.filter((row) => row.some((cell) => String(cell).trim() !== ""));
  const likelyTable = nonEmpty.filter((row) => row.length >= 2);
  const finalRows = likelyTable.length ? likelyTable : nonEmpty;

  const maxColumns = finalRows.reduce((max, row) => Math.max(max, row.length), 0);
  if (!maxColumns) {
    return { columns: [], rows: [] };
  }

  const nextColumns = Array.from({ length: maxColumns }, (_, index) => `Columna ${index + 1}`);

  const nextRows = finalRows.map((rawRow) => {
    const row = {};
    nextColumns.forEach((column, index) => {
      row[column] = rawRow[index] || "";
    });
    return row;
  });

  return { columns: nextColumns, rows: nextRows };
}

async function parsePdfInBrowser(file, onProgress) {
  if (!window.pdfjsLib) {
    throw new Error("No se pudo cargar pdf.js en el navegador.");
  }

  const buffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  const allRows = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageRows = buildRowsFromTextItems(textContent.items || []);
    allRows.push(...pageRows);

    const percentage = Math.round((pageIndex / pdf.numPages) * 100);
    onProgress(percentage);
  }

  return normalizeToTable(allRows);
}

function renderTable() {
  tableWrap.innerHTML = "";

  if (!columns.length) {
    tableWrap.innerHTML = '<p class="text-muted m-2">Aun no hay datos procesados.</p>';
    downloadBtn.disabled = true;
    removeEmptyColsBtn.disabled = true;
    return;
  }

  const table = document.createElement("table");
  table.className = "table table-sm table-bordered align-middle mb-0 preview-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  columns.forEach((column, colIndex) => {
    const th = document.createElement("th");

    const title = document.createElement("input");
    title.className = "form-control form-control-sm mb-2";
    title.value = column;
    title.addEventListener("change", () => {
      const newName = title.value.trim() || `Columna ${colIndex + 1}`;
      const oldName = columns[colIndex];
      columns[colIndex] = newName;
      rows = rows.map((row) => {
        const next = { ...row };
        next[newName] = next[oldName] ?? "";
        if (newName !== oldName) {
          delete next[oldName];
        }
        return next;
      });
      renderTable();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-outline-danger btn-sm w-100";
    removeBtn.textContent = "Eliminar";
    removeBtn.addEventListener("click", () => removeColumn(colIndex));

    th.appendChild(title);
    th.appendChild(removeBtn);
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    columns.forEach((column) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.className = "form-control form-control-sm";
      input.value = row[column] ?? "";
      input.addEventListener("change", () => {
        rows[rowIndex][column] = input.value;
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  downloadBtn.disabled = false;
  removeEmptyColsBtn.disabled = false;
}

function removeColumn(colIndex) {
  const removedColumn = columns[colIndex];
  columns = columns.filter((_, idx) => idx !== colIndex);
  rows = rows.map((row) => {
    const copy = { ...row };
    delete copy[removedColumn];
    return copy;
  });
  renderTable();
}

function removeEmptyColumns() {
  const keepColumns = columns.filter((column) =>
    rows.some((row) => String(row[column] ?? "").trim() !== "")
  );
  columns = keepColumns;
  rows = rows.map((row) => {
    const next = {};
    keepColumns.forEach((column) => {
      next[column] = row[column] ?? "";
    });
    return next;
  });
  renderTable();
}

function downloadCsv() {
  const csv = Papa.unparse(rows, {
    columns,
    delimiter: csvDelimiter.value,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `archivo_convertido_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadXlsx() {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  XLSX.writeFile(workbook, `archivo_convertido_${Date.now()}.xlsx`);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = pdfInput.files?.[0];
  if (!file) {
    showStatus("Selecciona un archivo PDF para continuar.", "warning");
    return;
  }

  if (file.type !== "application/pdf") {
    showStatus("El archivo seleccionado no es un PDF.", "warning");
    return;
  }

  try {
    showStatus("Procesando PDF localmente...", "info");
    startProgress();
    const data = await parsePdfInBrowser(file, setProgress);
    columns = data.columns || [];
    rows = data.rows || [];

    if (!columns.length) {
      showStatus("No se detectaron datos tabulares en el PDF.", "warning");
    } else {
      showStatus("PDF convertido. Puedes editar y descargar.", "success");
    }

    renderTable();
  } catch (error) {
    showStatus(error.message || "Error inesperado al convertir.", "danger");
  } finally {
    finishProgress();
  }
});

downloadBtn.addEventListener("click", () => {
  if (!rows.length || !columns.length) {
    showStatus("No hay datos para descargar.", "warning");
    return;
  }

  if (outputFormat.value === "csv") {
    downloadCsv();
  } else {
    downloadXlsx();
  }

  showStatus("Archivo generado y descargado.", "success");
});

removeEmptyColsBtn.addEventListener("click", removeEmptyColumns);
