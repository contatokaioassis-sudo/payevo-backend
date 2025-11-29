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
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY; // Chave secreta de autenticação
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID; // ID da sua empresa

const PAYEVO_BASE = "https://apiv2.payevo.com.br/functions/v1";

// =====================================
// 🔑 Autenticação BASIC
// =====================================
function basicAuth() {
  if (!PAYEVO_SECRET) {
      console.error("PAYEVO_SECRET_KEY não está definido!");
      // Retorna uma string básica para não quebrar, mas forçará a falha de autenticação
      return "Basic "; 
  }
  // Codifica a chave secreta e os dois pontos ":" em Base64
  return "Basic " + Buffer.from(`${PAYEVO_SECRET}:`).toString("base64");
}

// =====================================
// 📌 Criar PIX - USANDO A ESTRUTURA EXATA FORNECIDA
// =====================================
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Body recebido (Frontend):", req.body);

    // Desestruturando os campos do frontend
    const { amount, name, cpf, email, phone, planName, city, state } = req.body;

    // 1. Validação mínima de campos (o resto será validado pela PayEvo)
    if (!amount || !name || !cpf || !email || !phone || !planName) {
      return res.status(400).json({
        error: "Todos os campos de pagamento e plano são obrigatórios.",
      });
    }

    // 2. Montagem da ESTRUTURA EXATA DA PAYEVO
    const requestBody = {
      {
  "customer": {
    "name": "Jorge Santos",
    "email": "jorge.santos@gmail.com",
    "phone": "11983272733",
    "document": {
      "number": "04281554645",
      "type": "CPF"
    }
  },
  "paymentMethod": "PIX",
  "pix": {
    "expiresInDays": 1
  },
  "amount": 100,
  "items": [
    {
      "title": "Produto Teste 01",
      "unitPrice": 100,
      "quantity": 1,
      "externalRef": "PRODTESTE01"
    }
  ]
}
'
          externalRef: String(planName).toUpperCase().replace(/\s/g, '_'),
        }
      ],
      // Adicionando o Company ID, que era necessário na estrutura anterior.
      // Se a PayEvo devolver erro, podemos removê-lo.
      company_id: String(PAYEVO_COMPANY), 
    };
    
    console.log("Header de Autorização Enviado:", basicAuth());
    console.log("📤 Enviando para PayEvo (Novo Formato):", requestBody);

    // 3. Requisição para a API da PayEvo
    const response = await axios.post(`${PAYEVO_BASE}/transactions`, requestBody, {
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json",
        "Accept": "application/json"
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
