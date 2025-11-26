import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔑 ENV
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

const PAYEVO_BASE = "https://hub.payevo.com.br/functions/v1";

// Auth correta
function basicAuth() {
  return "Basic " + Buffer.from(`${PAYEVO_COMPANY}:${PAYEVO_SECRET}`).toString("base64");
}

// ===============================
// 📌 Criar PIX
// ===============================
app.post("/pix/create", async (req, res) => {
  try {
    const { amount, payer } = req.body;

    if (!amount || !payer?.name || !payer?.cpf_cnpj) {
      return res.status(400).json({
        error: "amount, name e cpf são obrigatórios"
      });
    }

    const body = {
      amount: Number(amount),
      company_id: PAYEVO_COMPANY,
      payer: {
        name: payer.name,
        cpf_cnpj: payer.cpf_cnpj,
        email: payer.email ?? null,
        phone: payer.phone ?? null
      }
    };

    const response = await axios.post(`${PAYEVO_BASE}/pix/create`, body, {
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json"
      }
    });

    return res.json(response.data);

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar PIX",
      details: error.response?.data || error.message
    });
  }
});

// ===============================
// 📌 Consultar status
// ===============================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    const response = await axios.get(`${PAYEVO_BASE}/pix/status/${txid}`, {
      headers: { Authorization: basicAuth() }
    });

    res.json(response.data);

  } catch (error) {
    res.status(500).json({
      error: "Erro ao consultar status",
      details: error.response?.data || error.message
    });
  }
});

// ===============================
const port = process.env.PORT || 8080;
app.listen(port, () => console.log("🔥 PayEvo backend ativo na porta", port));
