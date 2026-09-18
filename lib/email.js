import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT), // 465
  secure: true, // 'true' para a porta 465, 'false' para 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // Use a Senha de App do Zoho
  },
});

// Função para enviar e-mail genérico 
export async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"Adilson Mineiro" <${process.env.SMTP_USER}>`, // O 'from' deve ser seu e-mail Zoho
      to,
      subject,
      html,
    });
    console.log('E-mail enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw error;
  }
}