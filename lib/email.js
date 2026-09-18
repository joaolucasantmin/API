import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Adilson Mineiro <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw new Error(error.message);
    }

    console.log('E-mail enviado:', data.id);

    return data;
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw error;
  }
}