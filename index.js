// index.js — BACKEND PAYEVO 100% CORRIGIDO
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

// 🔑 VARIÁVEIS CORRETAS PARA API PAYEVO
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

const PAYEVO_BASE = "https://apiv2.payevo.com.br/functions/v1";

// 🔐 Auth básica
function basicAuth() {
  return "Basic " + Buffer.from(PAYEVO_SECRET).toString("base64");
}

app.get("/", (req, res) => res.send("Payevo backend running 🚀"));

// ============================
// 📌 1. GERAR PIX
// ============================
app.post("/pix/create", async (req, res) => {
  try {
    const { amount, name, cpf, email, phone } = req.body;

    if (!amount || !name || !cpf) {
      return res.status(400).json({ error: "Campos obrigatórios: amount, name, cpf" });
    }

    const response = await axios.post(
      `${PAYEVO_BASE}/pix/create`,
      {
        amount,
        company_id: PAYEVO_COMPANY,
        payer: {
          name,
          cpf_cnpj: cpf,
          email,
          phone
        }
      },
      {
        headers: {
          Authorization: basicAuth(),
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    return res.json({
      txid: response.data.txid,
      qrcode: response.data.qrcode,
      copia_cola: response.data.copia_cola
    });

  } catch (err) {
    console.error("🔥 ERRO PAYEVO CREATE:", err.response?.data || err.message);
    return res.status(500).json({ error: "Erro ao criar cobrança PIX", details: err.response?.data });
  }
});

// ============================
// 📌 2. CONSULTAR STATUS
// ============================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    if (!txid) return res.status(400).json({ error: "txid required" });

    const response = await axios.get(
      `${PAYEVO_BASE}/pix/status/${txid}`,
      {
        headers: { Authorization: basicAuth() },
        timeout: 15000
      }
    );

    return res.json({ status: response.data.status });

  } catch (err) {
    console.error("🔥 ERRO STATUS:", err.response?.data || err.message);
    return res.status(500).json({ error: "Erro ao consultar status", details: err.response?.data });
  }
});

// ============================
// SERVIDOR
// ============================
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Payevo Backend running on port ${port}`));
