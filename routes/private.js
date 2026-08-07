import express from 'express';
import bcrypt from 'bcrypt';
import supabase from '../config/supabase.js';

const router = express.Router();


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

export default router;
