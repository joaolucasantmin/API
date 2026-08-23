import express, { json } from 'express';
import bcrypt from 'bcrypt';
import supabase from '../config/supabase.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';
import upload from '../middlewares/upload.js';

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


// Rota de Consulta de um usuario (GET)
router.get("/perfil", async (req, res) => {

    try {

        const { id } = req.usuario;

        const { data, error } = await supabase
            .from("usuarios")
            .select("id, nome_usuario, email_usuario, cargo, foto_perfil")
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
router.delete('/usuarios/:id', auth, admin, async (req, res) => {

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


//Rota de alteração de perfil(PUT)
router.put("/perfil", auth, upload.single("foto_perfil"), async (req, res) => {

    try {
    const id = req.usuario.id;
    const { nome_usuario, senha } = req.body;

    let dadosAtualizados = {};

    //Atualiza nome
    if (nome_usuario) {
      dadosAtualizados.nome_usuario = nome_usuario;
    }

    //Atualiza senha
    if (senha) {
      dadosAtualizados.senha_usuario = await bcrypt.hash(senha, 10);
    }

    //Verifica se já existe algum usuário com esse nome
    if(nome_usuario){
        const {data: usuarioExistente, error: erroBusca} = await supabase
            .from("usuarios")
            .select("id")
            .eq("nome_usuario", nome_usuario)
            .neq("id", id)
            .maybeSingle();
        
        if(erroBusca){
            return res.status(500).json({
                error: erroBusca.message,
            });
        }

        if(usuarioExistente){
            return res.status(409).json({
                mensagem: "Esse nome de usuario já esta em uso.",
            });
        }

        dadosAtualizados.nome_usuario = nome_usuario;
    }



    if (req.file) {
      const nomeArquivo = `${id}-${Date.now()}`;

      const { error: uploadError } = await supabase.storage
        .from("perfil")
        .upload(nomeArquivo, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("perfil")
        .getPublicUrl(nomeArquivo);

      dadosAtualizados.foto_perfil = data.publicUrl;
    }

    //Caso nao há alterações, Evita requisições vazias
    if (!nome_usuario && !senha && !req.file) {
        return res.status(400).json({
            mensagem: "Nenhuma alteração enviada.",
        });
        }


    const { data, error } = await supabase
      .from("usuarios")
      .update(dadosAtualizados)
      .eq("id", id)
      .select("id, nome_usuario, email_usuario, cargo, foto_perfil")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (erro) {
    console.log(erro);
    return res.status(500).json({
      mensagem: "Erro ao atualizar perfil:",
    });
  }
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
router.get('/mensagens/:id', auth, async (req, res) => {
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
