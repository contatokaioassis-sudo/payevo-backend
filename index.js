// index.js — BACKEND PAYEVO CORRETÍSSIMO
import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*", methods: ["POST", "GET"], allowedHeaders: ["Content-Type", "Authorization"] }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// VARIÁVEIS CORRETAS
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

const PAYEVO_BASE = "https://apiv2.payevo.com.br/functions/v1";

// Auth básica no formato PayEvo
function basicAuth() {
  return "Basic " + Buffer.from(PAYEVO_SECRET).toString("base64");
}

app.get("/", (req, res) => res.send("Payevo backend rodando 🚀"));

// ===========================
// 1. GERAR PIX
// ===========================
app.post("/pix/create", async (req, res) => {
  try {
    const { amount, name, cpf, email, phone } = req.body;

    if (!amount || !name || !cpf) {
      return res.status(400).json({ error: "amount, name e cpf são obrigatórios" });
    }

    const requestBody = {
      amount,
      company_id: PAYEVO_COMPANY,
      payer: {
        name,
        cpf_cnpj: cpf,
        email,
        phone
      }
    };

    console.log("➡ ENVIANDO PARA PAYEVO:", requestBody);

    const response = await axios.post(
      `${PAYEVO_BASE}/pix/create`,
      requestBody,
      {
        headers: {
          Authorization: basicAuth(),
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      txid: response.data.txid,
      qrcode: response.data.qrcode,
      copia_cola: response.data.copia_cola
    });

  } catch (err) {
    console.error("❌ ERRO PAYEVO:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Erro ao criar cobrança PIX",
      details: err.response?.data
    });
  }
});

// ===========================
// 2. STATUS
// ===========================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    const response = await axios.get(
      `${PAYEVO_BASE}/pix/status/${txid}`,
      {
        headers: { Authorization: basicAuth() }
      }
    );

    return res.json({ status: response.data.status });

  } catch (err) {
    return res.status(500).json({ error: "Erro ao consultar status" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Backend Payevo ligado na porta ${port}`));
