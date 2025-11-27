import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// === CORS REAL ===
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});
app.use(express.json());

// 🔐 Variáveis PayEvo
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

const PAYEVO_BASE = "https://apiv2.payevo.com.br/functions/v1";

// =====================================
// 🔑 Autenticação BASIC CORRETA
// =====================================
function basicAuth() {
  return "Basic " + Buffer.from(`${PAYEVO_SECRET}:`).toString("base64");
}

// =====================================
// 📌 Criar PIX
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
  company_id: String(PAYEVO_COMPANY),
  payer: {
    name: String(name),
    cpf_cnpj: String(cpf),
    email: String(email || ""),
    phone: String(phone || "")
  }
};
    console.log("📤 Enviando para PayEvo:", body);

    const response = await axios.post(`${PAYEVO_BASE}/transactions`, body, {
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Resposta PayEvo:", response.data);
    res.json(response.data);

  } catch (err) {
    console.error("❌ ERRO AO CRIAR PIX:", err.response?.data || err.message);

    res.status(500).json({
      error: "Erro ao criar PIX",
      details: err.response?.data || err.message,
    });
  }
});

// =====================================
// 📌 Consultar Status
// =====================================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;
    if (!txid) return res.status(400).json({ error: "txid obrigatório" });

    const r = await axios.get(`${PAYEVO_BASE}/transactions/${txid}`, {
      headers: { Authorization: basicAuth() },
    });

    res.json(r.data);

  } catch (e) {
    res.status(500).json({
      error: "Erro ao consultar status",
      details: e.response?.data || e.message,
    });
  }
});

app.get("/", (req, res) => res.send("🔥 Backend PayEvo ativo!"));

const port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(`🔥 Servidor rodando na porta ${port}`)
);
