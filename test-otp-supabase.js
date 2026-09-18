import 'dotenv/config';
import { createOtp, verifyOtp } from './lib/otp.js';
import { sendEmail } from './lib/email.js';

const TEST_EMAIL = 'joaolucasantmin@gmail.com';

console.log('1. Criando OTP no Supabase...');
const code = await createOtp(TEST_EMAIL);
console.log('   Código:', code);

console.log('2. Enviando e-mail...');
await sendEmail(TEST_EMAIL, 'Teste OTP Supabase', `<h1>Seu código: ${code}</h1>`);
console.log(' E-mail enviado!');

console.log('3. Verificando com código ERRADO...');
console.log('   ', await verifyOtp(TEST_EMAIL, '000000'));

console.log('4. Verificando com código CORRETO...');
console.log('   ', await verifyOtp(TEST_EMAIL, code));
