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
router.post('/mensagens', auth, async (req, res) => {
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




//ROTAS DE AMIZADES

//Enviar pedido de amizade
router.post('/amizades', auth, async (req, res) =>{

    try {

        const solicitante = req.usuario.id;
        const { destinatario } = req.body;

        // Verifica se o destinatário foi enviado
        if (!destinatario) {
            return res.status(400).json({
                mensagem: "É necessário informar o usuário destinatário."
            });
        }

        // Impede enviar pedido para si mesmo
        if (Number(destinatario) === Number(solicitante)) {
            return res.status(400).json({
                mensagem: "Você não pode enviar um pedido para si mesmo."
            });
        }

        // Verifica se o usuário destinatário existe
        const { data: usuario, error: erroUsuario } = await supabase
            .from('usuarios')
            .select('id')
            .eq('id', destinatario)
            .maybeSingle();

        if (erroUsuario) {
            return res.status(500).json({
                error: erroUsuario.message
            });
        }

        if (!usuario) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado."
            });
        }

        // Verifica se já existe uma amizade/pedido entre os dois
        const { data: amizadeExistente, error: erroAmizade } = await supabase
            .from('amizades')
            .select('*')
            .or(
                `and(usuario_solicitante.eq.${solicitante},usuario_destinatario.eq.${destinatario}),and(usuario_solicitante.eq.${destinatario},usuario_destinatario.eq.${solicitante})`
            )
            .maybeSingle();

        if (erroAmizade) {
            return res.status(500).json({
                error: erroAmizade.message
            });
        }

        if (amizadeExistente) {

            if (amizadeExistente.status === 'aceito') {
                return res.status(409).json({
                    mensagem: "Vocês já são amigos."
                });
            }

            if (amizadeExistente.status === 'pendente') {
                return res.status(409).json({
                    mensagem: "Já existe um pedido de amizade pendente."
                });
            }

            // Se anteriormente foi recusado, podemos permitir um novo pedido
            if (amizadeExistente.status === 'recusado') {

                const { data, error } = await supabase
                    .from('amizades')
                    .update({
                        usuario_solicitante: solicitante,
                        usuario_destinatario: destinatario,
                        status: 'pendente',
                        data_criacao: new Date().toISOString()
                    })
                    .eq('id', amizadeExistente.id)
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({
                        error: error.message
                    });
                }

                return res.status(200).json({
                    mensagem: "Pedido de amizade enviado novamente.",
                    amizade: data
                });
            }
        }

        // Cria novo pedido
        const { data, error } = await supabase
            .from('amizades')
            .insert([{
                usuario_solicitante: solicitante,
                usuario_destinatario: destinatario,
                status: 'pendente'
            }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        return res.status(201).json({
            mensagem: "Pedido de amizade enviado.",
            amizade: data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            mensagem: "Erro interno ao enviar pedido de amizade."
        });
    }
});




    //Listar pedidos de amizade recebidos
    router.get('/amizades/pedidos', auth, async (req, res) => {

    try {

        const meuId = req.usuario.id;

        const { data, error } = await supabase
            .from('amizades')
            .select(`
                id,
                usuario_solicitante,
                usuario_destinatario,
                status,
                data_criacao,
                usuarios!amizades_usuario_solicitante_fkey (
                    id,
                    nome_usuario,
                    foto_perfil
                )
            `)
            .eq('usuario_destinatario', meuId)
            .eq('status', 'pendente')
            .order('data_criacao', { ascending: false });

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        return res.status(200).json({
            pedidos: data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            mensagem: "Erro interno ao buscar pedidos de amizade."
        });
    }

});


    //Rota para aceitar pedidos de amizades(APENAS PARA O USUARIO LOGADO)
    router.put('/amizades/:id/aceitar', auth, async (req, res) => {

    try {

        const meuId = req.usuario.id;
        const idAmizade = req.params.id;

        // Procura o pedido e verifica se pertence ao usuário logado
        const { data: pedido, error: erroBusca } = await supabase
            .from('amizades')
            .select('*')
            .eq('id', idAmizade)
            .eq('usuario_destinatario', meuId)
            .eq('status', 'pendente')
            .maybeSingle();

        if (erroBusca) {
            return res.status(500).json({
                error: erroBusca.message
            });
        }

        // Pedido não encontrado
        if (!pedido) {
            return res.status(404).json({
                mensagem: "Pedido de amizade não encontrado."
            });
        }

        // Aceita o pedido
        const { data, error } = await supabase
            .from('amizades')
            .update({
                status: 'aceito'
            })
            .eq('id', idAmizade)
            .select()
            .single();

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        return res.status(200).json({
            mensagem: "Pedido de amizade aceito!",
            amizade: data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            mensagem: "Erro interno ao aceitar pedido de amizade."
        });
    }

});

export default router;
