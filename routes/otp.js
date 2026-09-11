/* 
refs do otp
https://github.com/BiswajitAich/email-auth
https://github.com/BackendExpert/auth-core-db
https://github.com/BiswajitAich/email-auth
https://github.com/SrjAdhikari/Authentication-System
https://github.com/BiswajitAich/email-auth

*/
import express from "express";
import { createOtp, verifyOtp } from "../lib/otp.js";
import { sendEmail } from "../lib/email.js";

const router = express.Router();

// POST /API/otp/send
router.post("/otp/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^.+@.+$/.test(email)) {
      return res.status(400).json({ error: "E-mail inválido" });
    }

    const code = createOtp(email);

    await sendEmail(
      email,
      "Seu código de verificação",
      `
        <div style="font-family:sans-serif;max-width:400px">
          <h2>Verificação de e-mail</h2>
          <p>Seu código é:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
          <p style="color:#666">Válido por 5 minutos.</p>
        </div>
      `
    );

    res.json({ ok: true });
  } catch (err) {
    if (err.message === "RATE_LIMITED") {
      return res.status(429).json({ error: "Muitos envios. Tente mais tarde." });
    }
    console.error(err);
    res.status(500).json({ error: "Falha ao enviar" });
  }
});

// POST /API/otp/verify
router.post("/otp/verify", (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Dados faltando" });
  }

  const result = verifyOtp(email, code);

  if (result.valid) {
    return res.json({ ok: true });
  }

  const messages = {
    NOT_FOUND: "Código não encontrado ou expirado",
    EXPIRED: "Código expirado",
    TOO_MANY_ATTEMPTS: "Muitas tentativas. Gere um novo código.",
    INVALID: `Código errado. Restam ${result.remaining} tentativas.`,
  };

  res.status(400).json({ error: messages[result.reason] });
});

export default router;
//para testar: https://chatames.onrender.com/login