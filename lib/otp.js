// lib/otp.js
import crypto from 'crypto';

// Armazenamento em memória (para produção, use Redis ou Supabase)
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MS = 60 * 1000; // 1 minuto entre envios
const lastSentAt = new Map();

/**
 * Gera e armazena um OTP para o e-mail.
 * @param {string} email
 * @returns {string} Código OTP gerado
 */
export function createOtp(email) {
  // Rate limiting
  const last = lastSentAt.get(email);
  if (last && Date.now() - last < RATE_LIMIT_MS) {
    throw new Error('RATE_LIMITED');
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  otpStore.set(email, { code, expiresAt, attempts: 0 });
  lastSentAt.set(email, Date.now());

  return code;
}

/**
 * Verifica o OTP.
 * @param {string} email
 * @param {string} code
 * @returns {{ valid: boolean, reason?: string, remaining?: number }}
 */
export function verifyOtp(email, code) {
  const entry = otpStore.get(email);

  if (!entry) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    return { valid: false, reason: 'EXPIRED' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(email);
    return { valid: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    const remaining = MAX_ATTEMPTS - entry.attempts;

    if (remaining <= 0) {
      otpStore.delete(email);
      return { valid: false, reason: 'TOO_MANY_ATTEMPTS' };
    }

    return { valid: false, reason: 'INVALID', remaining };
  }

  otpStore.delete(email);
  return { valid: true };
}