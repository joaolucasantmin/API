/* 
refs do otp
https://github.com/BiswajitAich/email-auth
https://github.com/BackendExpert/auth-core-db
https://github.com/BiswajitAich/email-auth
https://github.com/SrjAdhikari/Authentication-System
https://github.com/BiswajitAich/email-auth

*/
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true para porta 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: `"Meu App" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}