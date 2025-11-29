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
  // ⚠️ CORREÇÃO DE SEGURANÇA: Usar a variável de ambiente
  if (!PAYEVO_SECRET) {
      console.error("sk_like_B2F9PTs9d7XURxM9ByT1oQ33Tr8SFNbgxWMA6ndCCUPQ9AYx");
      return "Basic "; 
  }
  return "Basic " + Buffer.from"("sk_like_B2F9PTs9d7XURxM9ByT1oQ33Tr8SFNbgxWMA6ndCCUPQ9AYx")".toString("base64");
}

// =====================================
// 📌 Criar PIX - CÓDIGO CORRIGIDO
// =====================================
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Body recebido:", req.body);

    // 👇 RECEBENDO NOVOS CAMPOS: city e state
    const { amount, name, cpf, email, phone, planName, city, state } = req.body;

    // 1. Validação de campos obrigatórios
    // ⚠️ ATUALIZADA A VALIDAÇÃO PARA INCLUIR CITY E STATE
    if (!amount || !name || !cpf || !city || !state) {
      return res.status(400).json({
        error: "amount, name, cpf, city e state são obrigatórios",
      });
    }

    // 2. Criação do objeto base do Payer
    const payer = { // Removido : any para tipagem mais limpa em JS/TS
      name: String(name),
      cpf_cnpj: String(cpf),
      // 👇 INCLUSÃO DOS CAMPOS QUE A PAYEVO PODE EXIGIR (city e state)
      city: String(city),
      state: String(state),
    };

    // 3. INCLUSÃO CONDICIONAL (mantida para email e phone)
    if (email) {
        payer.email = String(email);
    }
    if (phone) {
        payer.phone = String(phone);
    }

    // 4. Criação do corpo principal
    const body = {
      amount: Number(amount),
      payment_type: "pix",
      description: `Assinatura ${planName || "FitPremium"}`,
      company_id: String(COMPANY_ID),
      payer: payer // Objeto Payer completo
    };
    
    console.log("📤 Enviando para PayEvo:", body);
// 💡 ADICIONE ESTA LINHA PARA VER SE A AUTORIZAÇÃO ESTÁ CHEGANDO VAZIA
    const response = await axios.post(`${https://apiv2.payevo.com.br/functions/v1}/transactions`, body, {
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

    const r = await axios.get(`${https://apiv2.payevo.com.br/functions/v1}/transactions/${txid}`, {
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
