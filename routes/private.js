import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../config/supabase.js';

const router = express.Router();

//ROTAS DE USUARIO
// Rota de Consulta (GET)
router.get('/usuarios', async (req, res) => {

    const { data, error } = await supabase
        .from('usuarios')
        .select('*');

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    return res.status(200).json({
        usuarios: data
    });

});


// Rota de Consulta de UM usuario (GET)
router.get("/perfil", async (req, res) => {

    try {

        const { id } = req.usuario;

        const { data, error } = await supabase
            .from("usuarios")
            .select("id, nome_usuario, email_usuario")
            .eq("id", id)
            .single();

        if (error) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        res.json(data);

    } catch (error) {

        res.status(500).json({
            mensagem: "Erro interno."
        });

    }

});


// Rota de Exclusão (DELETE)
router.delete('/usuarios/:id', async (req, res) => {

    const { id } = req.params;

    const { data, error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)
        .select();

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    return res.status(200).json({
        message: 'Usuário deletado com sucesso!',
        data
    });

});


// Rota de Atualização (PUT)
router.put('/usuarios/:id', async (req, res) => {

    const { id } = req.params;
    const { nome_usuario, email_usuario, senha_usuario, foto_usuario } = req.body;

    let dadosAtualizados = {
        nome_usuario,
        email_usuario,
        foto_usuario
    };

    // Se enviou uma nova senha, criptografa ela
    if (senha_usuario) {
        dadosAtualizados.senha_usuario = await bcrypt.hash(senha_usuario, 10);
    }

    const { data, error } = await supabase
        .from('usuarios')
        .update(dadosAtualizados)
        .eq('id', id)
        .select();

    if (error) {
        return res.status(500).json({
            error: error.message
        });
    }

    return res.status(200).json({
        message: 'Usuário atualizado com sucesso!',
        data
    });

});



//ROTAS DE MENSAGENS
//Rota para pegar ID do usuario pelo JWT, frontend envia apenas destinatario e mensagem
router.post('/mensagens', async (req, res) => {
    const {destinatario, mensagem} = req.body;
    const remetente = req.usuario.id;

    const {data, error} = await supabase
        .from('mensagens')
        .insert([{
            cod_remetente: remetente,
            cod_destinatario: destinatario,
            mensagem
        }])
        .select();

    if(error) {
        return res.status(500).json(error);
    }    

    res.status(201).json(data[0]);
});


//Rota para carregar um mensagens
router.get('/mensagens/id:', auth, async (req, res) => {
    const meuId = req.usuario.id;
    const outroId = Number(req.params.id);

    const {data,error} = await supabase
        .from('mensagens')
        .select('*')
        .or(`and(cod_remetente.eq.${meuId},cod_destinatario.eq.${outroId}),and(cod_remetente.eq.${outroId},cod_destinatario.eq.${meuId})`)
        .order('data_envio', { ascending: true});

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);    
});

export default router;
