// 📌 Criar cobrança PIX
app.post("/pix/create", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const response = await axios.post(
      "https://api.payevo.app/pix/create",
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
      "https://api.payevo.app/pix/status",
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
