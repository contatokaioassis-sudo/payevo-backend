import express from "express";
import axios from "axios";
import cors from "cors";
import doten

dotenv.config();

const app = express();

// 🔓 CORS liberado
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
app.use(express.json());

// 🔐 Variáveis do Railway
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

const PAYEVO_BASE = "https://apiv2.payevo.com.br/functions/v1";

// =====================================
// 🔐 Autenticação BASIC CORRETA
// =====================================
function basicAuth() {
  return "Basic " + Buffer.from(PAYEVO_SECRET + ":").toString("base64");
}

// =====================================
// 📌 Criar cobrança PIX
// =====================================
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Body recebido:", req.body);

    const { amount, name, cpf, email, phone, planName } = req.body;

    if (!amount || !name || !cpf) {
      return res.status(400).json({
        error: "amount, name e cpf são obrigatórios",
      });
    }

    const body = {
      amount: Number(amount),
      payment_type: "pix",
      description: `Assinatura ${planName || "FitPremium"}`,
      company_id: PAYEVO_COMPANY,
      payer: {
        name,
        cpf_cnpj: String(cpf),
        email,
        phone,
      },
    };

    console.log("📤 Enviando para PayEvo:", body);

    const response = await axios.post(`${PAYEVO_BASE}/transactions`, body, {
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Resposta PayEvo:", response.data);
    return res.json(response.data);
  } catch (error) {
    console.error("❌ ERRO AO CRIAR PIX:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Erro ao criar PIX",
      details: error.response?.data || error.message,
    });
  }
});

// =====================================
// 📌 Status PIX
// =====================================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    if (!txid) {
      return res.status(400).json({ error: "txid obrigatório" });
    }

    const response = await axios.get(`${PAYEVO_BASE}/transactions/${txid}`, {
      headers: { Authorization: basicAuth() },
    });

    return res.json(response.data);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao consultar status",
      details: error.response?.data || error.message,
    });
  }
});

app.get("/", (req, res) => res.send("🔥 Backend PayEvo ativo!"));

const port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(`🔥 Servidor rodando na porta ${port}`)
);
