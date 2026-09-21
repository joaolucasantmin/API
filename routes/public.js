import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import { validarEmailPermitido} from '../utils/email.js'; 

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

        // Valida se o e-mail é de um domínio permitido
        const emailLimpo = user.email_usuario.trim().toLowerCase();

        const checkEmail = validarEmailPermitido(emailLimpo);

        if (!checkEmail.valido) {
        return res.status(400).json({
        error: checkEmail.motivo });
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
        const novoUsuario = data[0];

        const { error: erroAmizade } = await supabase
            .from('amizades')
            .insert([{
                usuario_solicitante: 44,
                usuario_destinatario: novoUsuario.id,
                status: 'aceito'
            }]);

        if (erroAmizade) {
            return res.status(500).json({
                error: erroAmizade.message
            });
        }

        // Gera o token já no cadastro, para logar o usuário automaticamente
        // (não há mais verificação de e-mail bloqueando o acesso)
        const token = jwt.sign(
            {
                id: novoUsuario.id,
                email: novoUsuario.email_usuario,
                cargo: novoUsuario.cargo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        return res.status(201).json({
            message: 'Cadastro realizado com sucesso!',
            token,
            usuario: {
                id: novoUsuario.id,
                nome_usuario: novoUsuario.nome_usuario,
                email_usuario: novoUsuario.email_usuario,
                foto_usuario: novoUsuario.foto_usuario
            }
        });

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

        // Normaliza o e-mail 
        const emailLimpo = email_usuario.trim().toLowerCase();

        // Bloqueia domínios fora da whitelist antes de tocar no banco.
        // Retorna 401 genérico pra não revelar se a conta existe.
        const checkEmail = validarEmailPermitido(emailLimpo);

        if (!checkEmail.valido) {
            return res.status(401).json({
                error: "e-mail ou senha inválidos!"
            });
        }

        const { data: usuario, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email_usuario', emailLimpo)
            .single();

        // Caso usuário for inválido, informar erro
        if (error || !usuario) {
            return res.status(401).json({
                error: "e-mail ou senha inválidos!"
            });
        }

        // Bloqueia contas antigas cujo e-mail está fora da whitelist,
        const checkEmailDoBanco = validarEmailPermitido(usuario.email_usuario);

        if (!checkEmailDoBanco.valido) {
            return res.status(403).json({
                error: "Sua conta usa um provedor de e-mail que não é mais aceito. Entre em contato com o suporte para atualizar seu cadastro."
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

        // Gera Token JWT
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
// ROTA: Solicitar troca de senha via administrador
// (usuário não recebe e-mail; admin define a nova senha
// e avisa manualmente por WhatsApp)
// POST /API/senha/solicitar-admin
// ======================================================
router.post('/senha/solicitar-admin', async (req, res) => {
  try {
    const { identificador, telefone } = req.body;

    if (!identificador || !telefone) {
      return res.status(400).json({
        error: 'Informe seu e-mail (ou nome de usuário) e um telefone para contato.'
      });
    }

    const { data: usuario, error: erroBusca } = await supabase
      .from('usuarios')
      .select('id, nome_usuario, email_usuario')
      .or(`email_usuario.eq.${identificador},nome_usuario.eq.${identificador}`)
      .maybeSingle();

    if (erroBusca) {
      return res.status(500).json({ error: erroBusca.message });
    }

    if (!usuario) {
      return res.status(404).json({
        error: 'Não encontramos essa conta. Confira o e-mail ou nome de usuário digitado.'
      });
    }

    // Evita criar solicitações duplicadas enquanto uma já estiver pendente
    const { data: pendente, error: erroPendente } = await supabase
      .from('solicitacoes_senha')
      .select('id')
      .eq('usuario_id', usuario.id)
      .eq('status', 'pendente')
      .maybeSingle();

    if (erroPendente) {
      return res.status(500).json({ error: erroPendente.message });
    }

    if (pendente) {
      return res.status(200).json({
        message: 'Você já tem uma solicitação pendente. Aguarde o contato do administrador pelo WhatsApp.'
      });
    }

    const { error: erroInsercao } = await supabase
      .from('solicitacoes_senha')
      .insert([{
        usuario_id: usuario.id,
        telefone,
        status: 'pendente'
      }]);

    if (erroInsercao) {
      return res.status(500).json({ error: erroInsercao.message });
    }

    return res.status(201).json({
      message: 'Solicitação enviada! O administrador vai entrar em contato pelo WhatsApp com sua nova senha.'
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});


export default router;