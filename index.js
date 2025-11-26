import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// 🔑 VARIÁVEIS DE AMBIENTE
// ===============================
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

// 👉 Base oficial da PayEvo V2
const PAYEVO_BASE = "https://apiv2.payevo.com.br/functions/v1";

// ===============================
// 🔐 AUTENTICAÇÃO (Basic Auth)
// ===============================
function basicAuth() {
  return "Basic " + Buffer.from(`${PAYEVO_SECRET}`).toString("base64");
}

// ===============================
// 📌 1. Criar Cobrança PIX (transactions)
// ===============================
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Recebido do FRONT:", req.body);

    // Aceita tanto req.body.payer quanto req.body direto
    const amount = req.body.amount;
    const name  = req.body.payer?.name     || req.body.name;
    const cpf   = req.body.payer?.cpf_cnpj || req.body.cpf;
    const email = req.body.payer?.email    || req.body.email || null;
    const phone = req.body.payer?.phone    || req.body.phone || null;

    if (!amount || !name || !cpf) {
      return res.status(400).json({ error: "amount, name e cpf são obrigatórios" });
    }

    // Corpo oficial para PayEvo V2 — PIX
    const body = {
      amount: Number(amount),
      payment_type: "pix",
      description: "Pagamento via PIX",
      company_id: PAYEVO_COMPANY,
      payer: {
        name,
        cpf_cnpj: cpf,
        email,
        phone
      }
    };

    console.log("📤 Enviando para PayEvo:", body);

    const response = await axios.post(
      `${PAYEVO_BASE}/transactions`,
      body,
      {
        headers: {
          Authorization: basicAuth(),
          "Content-Type": "application/json"
        }
      }
    );

    console.log("📥 Resposta PayEvo:", response.data);

    return res.json(response.data);

  } catch (error) {
    console.error("❌ ERRO AO CRIAR PIX:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Erro ao criar PIX",
      details: error.response?.data || error.message
    });
  }
});

// ===============================
// 📌 2. Consultar status de um pagamento
// ===============================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    if (!txid) {
      return res.status(400).json({ error: "txid obrigatório" });
    }

    console.log(`📥 Consultando status do TXID: ${txid}`);

    const response = await axios.get(
      `${PAYEVO_BASE}/transactions/${txid}`,
      {
        headers: {
          Authorization: basicAuth()
        }
      }
    );

    console.log("📥 Resposta PayEvo (status):", response.data);

    return res.json(response.data);

  } catch (error) {
    console.error("❌ ERRO AO CONSULTAR STATUS:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Erro ao consultar status PIX",
      details: error.response?.data || error.message
    });
  }
});

// ===============================
// 🩺 Healthcheck
// ===============================
app.get("/", (req, res) => {
  res.send("🔥 Backend PayEvo V2 ativo!");
});

// ===============================
// 🚀 SERVIDOR
// ===============================
const port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(`🔥 PayEvo backend rodando na porta ${port}`)
);
