const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors({ origin: true }));

function buildTableFromText(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 200);

  const parsedRows = lines.map((line) => line.split(/\s{2,}|\t+/).filter(Boolean));
  const maxColumns = parsedRows.reduce((max, row) => Math.max(max, row.length), 0);

  if (!maxColumns) {
    return { columns: [], rows: [] };
  }

  const columns = Array.from({ length: maxColumns }, (_, index) => `Columna ${index + 1}`);

  const rows = parsedRows.map((rawRow) => {
    const row = {};
    columns.forEach((column, index) => {
      row[column] = rawRow[index] || "";
    });
    return row;
  });

  return { columns, rows };
}

app.post("/parse-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Debes adjuntar un archivo PDF." });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "El archivo debe ser un PDF valido." });
    }

    const parsed = await pdfParse(req.file.buffer);
    const table = buildTableFromText(parsed.text || "");

    if (!table.columns.length) {
      return res.status(422).json({ error: "No se detectaron tablas o texto util en el PDF." });
    }

    return res.status(200).json(table);
  } catch (error) {
    logger.error("Error al parsear PDF", error);
    return res.status(500).json({ error: "Fallo el procesamiento del PDF." });
  }
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

exports.api = onRequest({ timeoutSeconds: 120, memory: "512MiB" }, app);
