import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import { createOtp, verifyOtp } from '../lib/otp.js';
import { sendEmail } from '../lib/email.js';

const router = express.Router();


// ======================================================
// ROTA: Cadastro (POST)
// ======================================================
router.post('/cadastro', async (req, res) => {

    try {

        const user = req.body;

        // Validando campos obrigatórios
        if (!user.nome_usuario || !user.email_usuario || !user.senha_usuario) {
            return res.status(400).json({
                error: 'Todos os campos são obrigatórios.'
            });
        }

        // Verifica se já existe usuário com mesmo e-mail ou nome
        const { data: usuarioExistente, error: erroBusca } = await supabase
            .from('usuarios')
            .select('id, nome_usuario, email_usuario')
            .or(`email_usuario.eq.${user.email_usuario},nome_usuario.eq.${user.nome_usuario}`);

        if (erroBusca) {
            return res.status(500).json({
                error: erroBusca.message
            });
        }

        if (usuarioExistente.length > 0) {

            if (usuarioExistente.some(u => u.email_usuario === user.email_usuario)) {
                return res.status(409).json({
                    error: 'Este e-mail já está cadastrado.'
                });
            }

            if (usuarioExistente.some(u => u.nome_usuario === user.nome_usuario)) {
                return res.status(409).json({
                    error: 'Este nome de usuário já está em uso.'
                });
            }
        }

        // Criptografa a senha
        const senhaHash = await bcrypt.hash(user.senha_usuario, 10);

        // Insere o usuário
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nome_usuario: user.nome_usuario,
                email_usuario: user.email_usuario,
                senha_usuario: senhaHash,
            }])
            .select();

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        // Adiciona o Adilson (Cliente/Técnico) automaticamente como amigo
        const novoUsuarioId = data[0].id;

        const { error: erroAmizade } = await supabase
            .from('amizades')
            .insert([{
                usuario_solicitante: 44,
                usuario_destinatario: novoUsuarioId,
                status: 'aceito'
            }]);

        if (erroAmizade) {
            return res.status(500).json({
                error: erroAmizade.message
            });
        }

        return res.status(201).json(data);

    } catch (error) {

        return res.status(500).json({
            message: error.message
        });

    }

});


// ======================================================
// ROTA: Login (POST)
// ======================================================
router.post('/login', async (req, res) => {
    try {
        const { email_usuario, senha_usuario } = req.body;

        if (!email_usuario || !senha_usuario) {
            return res.status(400).json({
                error: "Informe e-mail e senha!"
            });
        }

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email_usuario', email_usuario)
            .single();

        // Caso usuário for inválido, informar erro
        if (error || !usuario) {
            return res.status(401).json({
                error: "e-mail ou senha inválidos!"
            });
        }

        // Comparando senha no banco com a digitada
        const senhaCorreta = await bcrypt.compare(
            senha_usuario,
            usuario.senha_usuario
        );

        // Se senha incorreta
        if (!senhaCorreta) {
            return res.status(401).json({
                error: "e-mail ou senha inválidos!"
            });
        }

        // Gerar Token JWT
        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email_usuario,
                cargo: usuario.cargo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // Retornando caso Login realizado com sucesso
        return res.status(200).json({
            message: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                nome_usuario: usuario.nome_usuario,
                email_usuario: usuario.email_usuario,
                foto_usuario: usuario.foto_usuario
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Erro no Servidor!' });
    }
});


// ======================================================
// ROTA: Enviar código OTP para verificação de e-mail
// POST /API/otp/send
// ======================================================
router.post('/otp/send', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^.+@.+$/.test(email)) {
            return res.status(400).json({
                error: 'E-mail inválido.'
            });
        }

        // (Opcional) Bloqueia se o e-mail já estiver cadastrado
        const { data: existente, error: erroBusca } = await supabase
            .from('usuarios')
            .select('id')
            .eq('email_usuario', email)
            .maybeSingle();

        if (erroBusca) {
            return res.status(500).json({
                error: erroBusca.message
            });
        }

        if (existente) {
            return res.status(409).json({
                error: 'Este e-mail já está cadastrado.'
            });
        }

        const code = createOtp(email);

        await sendEmail(
            email,
            'Seu código de verificação',
            `
                <div style="font-family:sans-serif;max-width:400px">
                  <h2>Verificação de e-mail</h2>
                  <p>Seu código é:</p>
                  <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
                  <p style="color:#666">Válido por 5 minutos.</p>
                  <p style="color:#999;font-size:12px">Se você não solicitou este código, ignore este e-mail.</p>
                </div>
            `
        );

        return res.status(200).json({
            message: 'Código enviado com sucesso!'
        });

    } catch (error) {

        if (error.message === 'RATE_LIMITED') {
            return res.status(429).json({
                error: 'Muitos envios. Tente novamente mais tarde.'
            });
        }

        return res.status(500).json({
            message: error.message
        });
    }
});


// ======================================================
// ROTA: Verificar código OTP
// POST /API/otp/verify
// ======================================================
router.post('/otp/verify', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({
                error: 'Informe e-mail e código.'
            });
        }

        const result = verifyOtp(email, code);

        if (result.valid) {
            return res.status(200).json({
                message: 'E-mail verificado com sucesso!',
                verificado: true
            });
        }

        const mensagens = {
            NOT_FOUND: 'Código não encontrado ou expirado.',
            EXPIRED: 'Código expirado. Solicite um novo.',
            TOO_MANY_ATTEMPTS: 'Muitas tentativas. Solicite um novo código.',
            INVALID: `Código incorreto. Restam ${result.remaining} tentativas.`,
        };

        return res.status(400).json({
            error: mensagens[result.reason]
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});


export default router;