import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ENV
const PAYEVO_SECRET = process.env.PAYEVO_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYEVO_COMPANY_ID;

// CANDIDATAS de base (ordem preferencial)
const PAYEVO_BASE_CANDIDATES = [
  "https://apiv2.payevo.com.br/functions/v1",    // aparece em exemplos públicos
  "https://hub.payevo.com.br/functions/v1"      // base que você usou antes
];

// Funções de auth candidatas
function auth_secret_only() {
  return "Basic " + Buffer.from(`${PAYEVO_SECRET ?? ""}`).toString("base64");
}
function auth_company_and_secret() {
  return "Basic " + Buffer.from(`${PAYEVO_COMPANY ?? ""}:${PAYEVO_SECRET ?? ""}`).toString("base64");
}

// Helper: detecta se resposta é JSON útil (em vez de HTML)
function looksLikeJsonResponse(headers, data) {
  const ct = (headers?.["content-type"] || "").toLowerCase();
  if (ct.includes("application/json") || ct.includes("application/vnd.api+json")) return true;
  // às vezes a API retorna JSON como text/plain
  if (ct.includes("text/plain") && typeof data === "object") return true;
  // fallback: se o body começar com "<!doctype" ou "<html", é HTML
  if (typeof data === "string") {
    const s = data.trim().slice(0, 20).toLowerCase();
    if (s.startsWith("<!doctype") || s.startsWith("<html") || s.includes("meta name=\"viewport\"")) return false;
  }
  return false;
}

// Faz request com tentativas em combinações (base x auth)
async function postToPayevoWithFallback(path, payload, timeout = 20000) {
  const tries = [];
  // montamos todas as combinações
  const authCandidates = [auth_company_and_secret(), auth_secret_only()];
  for (const base of PAYEVO_BASE_CANDIDATES) {
    for (const auth of authCandidates) {
      tries.push({ base, auth });
    }
  }

  let lastError = null;
  for (const attempt of tries) {
    const url = `${attempt.base}${path}`;
    try {
      console.log(`➡️ Tentando PayEvo: url=${url} auth=${attempt.auth.slice(0, 10)}...`);
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: attempt.auth,
          "Content-Type": "application/json"
        },
        timeout,
        validateStatus: () => true // aceitaremos qualquer status para analisar body/headers
      });

      console.log(`🔁 Resposta PayEvo: status=${response.status} content-type=${response.headers["content-type"]}`);

      // Se a resposta parecer JSON válido, devolvemos
      if (looksLikeJsonResponse(response.headers, response.data)) {
        // Se a API retornou erro 4xx/5xx com JSON, devolvemos isso pro chamador
        if (response.status >= 200 && response.status < 300) {
          return { ok: true, data: response.data, meta: { usedUrl: url, usedAuth: attempt.auth.slice(0, 10) } };
        } else {
          // resposta JSON com erro (ex: 400) — devolve também
          return { ok: false, data: response.data, status: response.status, meta: { usedUrl: url, usedAuth: attempt.auth.slice(0, 10) } };
        }
      }

      // Se veio HTML, consideramos que essa combinação falhou — tenta próxima combinação
      lastError = {
        message: "Resposta não-JSON (possível HTML / landing page)",
        status: response.status,
        headers: response.headers,
        bodyPreview: typeof response.data === "string" ? response.data.slice(0, 800) : null,
        meta: { usedUrl: url, usedAuth: attempt.auth.slice(0, 10) }
      };
      console.warn("⚠️ PayEvo retornou HTML ou conteúdo inesperado. Tentando próxima combinação...");
    } catch (err) {
      lastError = { message: err.message, stack: err.stack };
      console.error("❌ Erro de rede/axios ao falar com PayEvo:", err.message);
    }
  }

  // se veio até aqui, todas as combinações falharam
  return { ok: false, error: lastError };
}

// ===============================
// ROTA: criar PIX (com fallback)
app.post("/pix/create", async (req, res) => {
  try {
    console.log("📥 Recebido do FRONT:", req.body);

    const amount = req.body.amount;
    const name  = req.body.payer?.name     || req.body.name;
    const cpf   = req.body.payer?.cpf_cnpj || req.body.cpf;
    const email = req.body.payer?.email    || req.body.email || null;
    const phone = req.body.payer?.phone    || req.body.phone || null;

    if (!amount || !name || !cpf) {
      return res.status(400).json({ error: "amount, name e cpf são obrigatórios" });
    }

    const body = {
      amount: Number(amount),
      company_id: PAYEVO_COMPANY,
      payer: { name, cpf_cnpj: cpf, email, phone }
    };

    // Faz a chamada com tentativas automáticas
    const result = await postToPayevoWithFallback("/pix/create", body);

    if (result.ok) {
      console.log("✅ Chamada PayEvo bem-sucedida", result.meta);
      // Retornamos o JSON original da PayEvo
      return res.status(200).json(result.data);
    } else {
      console.error("❌ Todas as tentativas falharam:", result.error);
      // Se a resposta da PayEvo foi JSON mas com erro, devolve pro front
      if (result.data) {
        return res.status(result.status || 500).json(result.data);
      }
      // Senão devolve o último erro detalhado pra facilitar debug
      return res.status(502).json({
        error: "Falha ao comunicar com PayEvo",
        details: result.error
      });
    }
  } catch (error) {
    console.error("❌ ERRO INTERNO na rota /pix/create:", error);
    return res.status(500).json({
      error: "Erro interno ao criar PIX",
      details: error.message
    });
  }
});

// ===============================
// ROTA: consultar status (simples)
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;
    if (!txid) return res.status(400).json({ error: "txid obrigatório" });

    // uso do helper para GET simplificado
    // aqui usamos a mesma lógica: testar as bases e auth até obter JSON
    const tries = [];
    const authCandidates = [auth_company_and_secret(), auth_secret_only()];
    for (const base of PAYEVO_BASE_CANDIDATES) {
      for (const auth of authCandidates) tries.push({ base, auth });
    }

    let lastErr = null;
    for (const attempt of tries) {
      const url = `${attempt.base}/pix/status/${txid}`;
      try {
        console.log(`➡️ Tentando status: ${url}`);
        const response = await axios.get(url, {
          headers: { Authorization: attempt.auth },
          timeout: 15000,
          validateStatus: () => true
        });
        console.log("🔁 status response:", response.status, response.headers["content-type"]);
        if (looksLikeJsonResponse(response.headers, response.data)) {
          return res.status(response.status).json(response.data);
        } else {
          lastErr = { message: "Resposta não JSON", status: response.status, headers: response.headers };
        }
      } catch (err) {
        lastErr = { message: err.message };
      }
    }

    return res.status(502).json({ error: "Falha ao consultar status PayEvo", details: lastErr });

  } catch (error) {
    console.error("❌ ERRO /pix/status:", error);
    return res.status(500).json({ error: "Erro interno", details: error.message });
  }
});

// health
app.get("/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🔥 PayEvo backend ativo na porta ${port}`));
