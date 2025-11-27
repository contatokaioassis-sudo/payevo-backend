import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json());


const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

const PAYEVO_BASE = "https://apiv2.payevo.com.br/functions/v1";

// Auth PayEvo
function basicAuth() {
  authorization: 'Basic ' + Buffer.from("{sk_like_B2F9PTs9d7XURxM9ByT1oQ33Tr8SFNbgxWMA6ndCCUPQ9AYx}:x").toString('base64')
    }
}


// =====================================
// 📌 Criar cobrança PIX
// =====================================
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Body recebido:", req.body);

    const amount = req.body.amount;

    // Aceita qualquer formato enviado pelo front
    const name =
      req.body.payer?.name ||
      req.body.name;

    const cpf =
      req.body.payer?.cpf_cnpj ||
      req.body.payer?.cpf ||
      req.body.cpf_cnpj ||
      req.body.cpf;

    const email =
      req.body.payer?.email ||
      req.body.email ||
      null;

    const phone =
      req.body.payer?.phone ||
      req.body.phone ||
      null;

    if (!amount || !name || !cpf) {
      return res.status(400).json({
        error: "amount, name e cpf são obrigatórios"
      });
    }

    const body = {
    amount: Number(amount),
    payment_type: "pix",
    description: `Assinatura ${req.body.planName || "FitPremium"}`, // 🔥 OK
    company_id: PAYEVO_COMPANY,
    payer: {
    name,
    cpf_cnpj: String(cpf), // 🔥 GARANTE QUE NUNCA SERÁ undefined
    email,
    phone,
  },
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

// =====================================
// 📌 Consultar status
// =====================================
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    if (!txid) {
      return res.status(400).json({
        error: "txid obrigatório"
      });
    }

    const response = await axios.get(
      `${PAYEVO_BASE}/transactions/${txid}`,
      {
        headers: {
          Authorization: basicAuth()
        }
      }
    );

    return res.json(response.data);

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao consultar status",
      details: error.response?.data || error.message
    });
  }
});

app.get("/", (req, res) => {
  res.send("🔥 Backend PayEvo V2 rodando!");
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🔥 Servidor rodando na porta ${port}`));
