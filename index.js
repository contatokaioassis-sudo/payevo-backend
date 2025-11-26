import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// 🔥 CORS COMPLETO COM SUPORTE A OPTIONS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// 🔥 OBRIGATÓRIO PARA RECEBER req.body !!!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 🔥 Correção definitiva de CORS + preflight
app.options("*", cors());  // Responde automaticamente OPTIONS para qualquer rota


// 🔑 VARIÁVEIS PAYEVO
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;
const PAYEVO_BASE = "https://hub.payevo.com.br/functions/v1/pix/create";

// 🔐 AUTH PAYEVO
function basicAuth() {
  return "Basic " + Buffer.from(PAYEVO_SECRET).toString("base64");
}

app.get("/", (req, res) => {
  res.send("🔥 PayEvo Backend ativo com sucesso!");
});

// ===============================
// 📌 1. Criar cobrança PIX
// ===============================
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Recebido no backend:", req.body);

    const amount = req.body.amount;
const name = req.body.payer?.name;
const cpf = req.body.payer?.cpf_cnpj;
const email = req.body.payer?.email;
const phone = req.body.payer?.phone;

if (!amount || !name || !cpf) {
  return res.status(400).json({
    error: "amount, name e cpf são obrigatórios"
  });
}


    // 🔥 Corpo conforme documentação OFICIAL
    const body = {
      amount: Number(amount),
      company_id: 435a00aa-1c9d-42ee-9b31-71f34d653985,
      payer: {
        name,
        cpf_cnpj: cpf,
        email: email ?? null,
        phone: phone ?? null
      }
    };

    console.log("📤 Enviando para PayEvo:", body);

    const response = await axios.post(`${PAYEVO_BASE}/pix/create`, body, {
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json"
      },
      timeout: 20000
    });

    console.log("📥 Resposta PayEvo:", response.data);

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
// 📌 2. Consultar status
// ===============================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    if (!txid) {
      return res.status(400).json({ error: "txid obrigatório" });
    }

    const url = `${PAYEVO_BASE}/pix/status/${txid}`;

    const response = await axios.get(url, {
      headers: { Authorization: basicAuth() },
      timeout: 15000
    });

    return res.json({ status: response.data.status });

  } catch (error) {
    console.error("❌ ERRO AO CONSULTAR STATUS:", error.response?.data || error.message);

    return res.status(500).json({
      error: "Erro ao consultar status PIX",
      details: error.response?.data || error.message
    });
  }
});

// ===============================
// 🚀 SERVIDOR
// ===============================
const port = process.env.PORT || 8080; 
app.listen(port, () => {
  console.log(`🔥 Backend PayEvo rodando na porta ${port}`);
});
