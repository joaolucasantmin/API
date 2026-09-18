import nodemailer from 'nodemailer';
import { smtpConfig, smtpFrom } from '../config/smtp.js';

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
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