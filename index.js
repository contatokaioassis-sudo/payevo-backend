// index.js
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json());

const PAYEVO_BASE = process.env.PAYEVO_API_BASE_URL || "https://apiv2.payevo.com.br/functions/v1";
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

if (!PAYEVO_SECRET || !PAYEVO_COMPANY) {
  console.warn("⚠️ PAYEVO_SECRET_KEY or PAYEVO_COMPANY_ID not set in env");
}

function basicAuthHeader(secret) {
  // a doc mostra 'Basic ' + base64(secret)
  return "Basic " + Buffer.from(String(secret)).toString("base64");
}

app.get("/", (_req, res) => res.send("Payevo backend running"));

app.post("/pix/create", async (req, res) => {
  try {
    const { amount, description = "Cobrança PIX", metadata = {} } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "amount required" });
    }

    const url = `${PAYEVO_BASE}/transactions`;

    // Body format — a doc usa /transactions; ajuste conforme exemplos da doc se precisar
    const body = {
      amount,
      company_id: PAYEVO_COMPANY,
      description,
      metadata
    };

    const response = await axios.post(url, body, {
      headers: {
        Authorization: basicAuthHeader(PAYEVO_SECRET),
        "Content-Type": "application/json"
      },
      timeout: 15000
    });

    // repassa dados úteis ao frontend
    return res.json({
      qrcode: response.data.qrcode ?? null,
      txid: response.data.txid ?? response.data.id ?? null,
      raw: response.data
    });

  } catch (err) {
    console.error("Payevo create error:", err?.response?.data ?? err.message ?? err);
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { error: "Erro ao criar cobrança PIX" };
    return res.status(status).json({ error: data });
  }
});

app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;
    if (!txid) return res.status(400).json({ error: "txid required" });

    const url = `${PAYEVO_BASE}/transactions/${encodeURIComponent(txid)}/status`; // ajuste conforme doc (ver abaixo)
    // se a doc tiver outro path, substitua por `${PAYEVO_BASE}/transactions/status` e envie { txid }
    const response = await axios.get(url, {
      headers: { Authorization: basicAuthHeader(PAYEVO_SECRET) },
      timeout: 10000
    });

    return res.json({ status: response.data.status ?? response.data });
  } catch (err) {
    console.error("Payevo status error:", err?.response?.data ?? err.message);
    return res.status(500).json({ error: "Erro ao consultar status PIX", details: err?.response?.data ?? null });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));
