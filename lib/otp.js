/* 
refs do otp
https://github.com/BiswajitAich/email-auth
https://github.com/BackendExpert/auth-core-db
https://github.com/BiswajitAich/email-auth
https://github.com/SrjAdhikari/Authentication-System
https://github.com/BiswajitAich/email-auth

*/
import crypto from "crypto";
import store from "./otpStore.js";

const CODE_TTL = 300;        // 5 minutos
const MAX_ATTEMPTS = 5;
const MAX_SEND_PER_HOUR = 5;

function generateCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hash(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function createOtp(email) {
  const now = Date.now();

  // Rate limit por hora
  const send = store.get(`send:${email}`) || { count: 0, start: now };
  if (now - send.start > 3_600_000) {
    send.count = 0;
    send.start = now;
  }
  if (send.count >= MAX_SEND_PER_HOUR) throw new Error("RATE_LIMITED");
  send.count++;
  store.set(`send:${email}`, send);

  const code = generateCode();

  // Novo código invalida o anterior
  store.set(`otp:${email}`, {
    hash: hash(code),
    expiresAt: now + CODE_TTL * 1000,
    attempts: 0,
  });

  return code;
}

export function verifyOtp(email, input) {
  const rec = store.get(`otp:${email}`);
  if (!rec) return { valid: false, reason: "NOT_FOUND" };

  if (Date.now() > rec.expiresAt) {
    store.delete(`otp:${email}`);
    return { valid: false, reason: "EXPIRED" };
  }

  if (rec.attempts >= MAX_ATTEMPTS) {
    store.delete(`otp:${email}`);
    return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const inputHash = hash(input);
  const valid = crypto.timingSafeEqual(
    Buffer.from(inputHash),
    Buffer.from(rec.hash)
  );

  if (!valid) {
    rec.attempts++;
    store.set(`otp:${email}`, rec);
    return { valid: false, reason: "INVALID", remaining: MAX_ATTEMPTS - rec.attempts };
  }

  store.delete(`otp:${email}`);
  return { valid: true };
}