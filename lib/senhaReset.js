import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESET_EXPIRY_MS = 30 * 60 * 1000; // 30 minutos
const RATE_LIMIT_MS = 60 * 1000;        // 1 minuto entre solicitações

/**
 * Cria um token de reset para o e-mail.
 * @param {string} email
 * @returns {Promise<string>} Token gerado
 */
export async function criarTokenReset(email) {
  // Rate limiting
 const { data: ultimo } = await supabase
  .from('senha_resetar')
  .select('created_at')
  .eq('email', email)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

  if (ultimo && Date.now() - new Date(ultimo.created_at).getTime() < RATE_LIMIT_MS) {
    throw new Error('RATE_LIMITED');
  }

  // Token seguro de 32 bytes em hex (64 chars)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_MS).toISOString();

  // Invalida tokens antigos desse e-mail
  await supabase.from('senha_resetar').delete().eq('email', email);  

  const { error } = await supabase
    .from('senha_resetar')                       
    .insert({ email, token, expires_at: expiresAt });

  if (error) {
    console.error('Erro ao salvar token de reset:', error);
    throw new Error('DB_ERROR');
  }

  return token;
}

/**
 * Valida se o token é válido (existe, não expirou, não foi usado).
 * @param {string} token
 * @returns {Promise<{ valid: boolean, email?: string, reason?: string }>}
 */
export async function validarTokenReset(token) {
  const { data, error } = await supabase
    .from('senha_resetar')                       
    .select('email, expires_at, used')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return { valid: false, reason: 'NOT_FOUND' };
  if (data.used) return { valid: false, reason: 'USED' };
  if (new Date() > new Date(data.expires_at)) {
    await supabase.from('senha_resetar').delete().eq('token', token);  
    return { valid: false, reason: 'EXPIRED' };
  }

  return { valid: true, email: data.email };
}

/**
 * Marca o token como usado e retorna o e-mail.
 * @param {string} token
 * @returns {Promise<{ success: boolean, email?: string, reason?: string }>}
 */
export async function consumirTokenReset(token) {
  const validacao = await validarTokenReset(token);
  if (!validacao.valid) return { success: false, reason: validacao.reason };

  const { error } = await supabase
    .from('senha_resetar')                       
    .update({ used: true })
    .eq('token', token);

  if (error) return { success: false, reason: 'DB_ERROR' };

  return { success: true, email: validacao.email };
}