const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { PdfReader } = require("pdfreader");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors({ origin: true }));

function extractTableByColumns(buffer) {
  return new Promise((resolve, reject) => {
    const COLS = [
      { name: "Rg", x0: 0, x1: 1.4 },
      { name: "Codigo", x0: 1.4, x1: 2.4 },
      { name: "Descripcion", x0: 2.4, x1: 5.6 },
      { name: "Cant", x0: 5.6, x1: 6.8 },
      { name: "PUnit", x0: 6.8, x1: 8.4 },
      { name: "Total", x0: 8.4, x1: 99 },
    ];

    const lineMap = {};

    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) return reject(err);

      if (!item) {
        const rows = Object.keys(lineMap)
          .sort((a, b) => parseFloat(a) - parseFloat(b))
          .map((y) => {
            const row = {};
            COLS.forEach((c) => {
              row[c.name] = (lineMap[y][c.name] || []).join(" ");
            });
            return row;
          })
          .filter((row) => row.Rg || row.Codigo);

        return resolve({ columns: COLS.map((c) => c.name), rows });
      }

      if (!item.text) return;

      const y = item.y.toFixed(2);
      const x = item.x;
      const col = COLS.find((c) => x >= c.x0 && x < c.x1);
      if (!col) return;

      if (!lineMap[y]) lineMap[y] = {};
      if (!lineMap[y][col.name]) lineMap[y][col.name] = [];
      lineMap[y][col.name].push(item.text);
    });
  });
}

app.post("/parse-pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Debes adjuntar un archivo PDF." });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "El archivo debe ser un PDF valido." });
    }

    const table = await extractTableByColumns(req.file.buffer);

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
