import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ✅ CORS agora totalmente liberado e configurado
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

const PAYEVO_SECRET = process.env.PAYER_SECRET_KEY;
const PAYEVO_COMPANY = process.env.PAYER_COMPANY_ID;

app.get("/", (req, res) => {
  res.send("Payevo backend is running!");
});

// 📌 Criar cobrança PIX
app.post("/pix/create", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const response = await axios.post(
      ""https://api.payevo.com/pix/create"",
      {
        amount,
        company_id: PAYEVO_COMPANY,
        metadata: { userId }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYEVO_SECRET}`,
        },
      }
    );

    res.json({
      qrcode: response.data.qrcode,
      txid: response.data.txid,
      status: "pending",
    });

  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).json({ error: "Erro ao criar cobrança PIX" });
  }
});

// 📌 Consultar status PIX
app.post("/pix/status", async (req, res) => {
  try {
    const { txid } = req.body;

    const response = await axios.post(
      "https://api.payevo.com/pix/status",
      { txid, company_id: PAYEVO_COMPANY },
      {
        headers: {
          Authorization: `Bearer ${PAYEVO_SECRET}`,
        },
      }
    );

    res.json({
      status: response.data.status,
      paid_at: response.data.paid_at,
    });

  } catch (error) {
    console.error(error.response?.data || error);
    res.status(500).json({ error: "Erro ao consultar status PIX" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
