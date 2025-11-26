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

// Auth correta — company_id:secret_key
function basicAuth() {
  return "Basic " + Buffer.from(`${PAYEVO_COMPANY}:${PAYEVO_SECRET}`).toString("base64");
}

// ===============================
// 📌 Criar PIX (corrigido)
// ===============================
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Recebido do FRONT:", req.body);

    const amount = req.body.amount;

    // Aceita formato antigo e novo
    const name  = req.body.payer?.name     || req.body.name;
    const cpf   = req.body.payer?.cpf_cnpj || req.body.cpf;
    const email = req.body.payer?.email    || req.body.email || null;
    const phone = req.body.payer?.phone    || req.body.phone || null;

    // Validação
    if (!amount || !name || !cpf) {
      console.log("❌ Falhou — campos inválidos");
      return res.status(400).json({
        error: "amount, name e cpf são obrigatórios"
      });
    }

    const body = {
      amount: Number(amount),
      company_id: PAYEVO_COMPANY,
      payer: {
        name,
        cpf_cnpj: cpf,
        email,
        phone
      }
    };

    console.log("📤 Enviando para PayEvo:", body);

    const response = await axios.post(`${PAYEVO_BASE}/pix/create`, body, {
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json"
      }
    });

    console.log("📥 Resposta da PayEvo:", response.data);

    return res.json({
      txid: response.data.txid,
      qrcode: response.data.qrcode,
      copiaecola: response.data.copiaecola
    });

  } catch (error) {
    console.error("❌ ERRO AO CRIAR PIX:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Erro interno ao criar PIX",
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

    if (!txid) {
      return res.status(400).json({ error: "txid obrigatório" });
    }

    console.log("📥 Consultando status:", txid);

    const response = await axios.get(`${PAYEVO_BASE}/pix/status/${txid}`, {
      headers: { Authorization: basicAuth() }
    });

    return res.json({ status: response.data.status });

  } catch (error) {
    console.error("❌ ERRO AO CONSULTAR STATUS:", error.response?.data || error.message);

    res.status(500).json({
      error: "Erro ao consultar status",
      details: error.response?.data || error.message
    });
  }
});

// ===============================
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🔥 PayEvo backend ativo na porta ${port}`));
