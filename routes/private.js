import express, { json } from 'express';
import bcrypt from 'bcrypt';
import supabase from '../config/supabase.js';
import auth from '../middlewares/auth.js';
import admin from '../middlewares/admin.js';
import upload from '../middlewares/upload.js';

const router = express.Router();


// Verifica se existe bloqueio entre dois usuários
const existeBloqueio = async (usuario1, usuario2) => {

    const { data, error } = await supabase
        .from('bloqueios')
        .select('id')
        .or(
            `and(usuario_bloqueador.eq.${usuario1},usuario_bloqueado.eq.${usuario2}),and(usuario_bloqueador.eq.${usuario2},usuario_bloqueado.eq.${usuario1})`
        )
        .maybeSingle();

    if (error) {
        throw error;
    }

    return !!data;
};



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
    //Rota para envio de mensagens, seja elas com anexo ou não
    router.post(
    '/mensagens',
    auth,
    (req, res, next) => {

        upload.single("arquivo")(req, res, (err) => {

            if (err) {

                console.log("ERRO DO MULTER:");
                console.log(err);

                // Arquivo maior que 10 MB
                if (err.code === "LIMIT_FILE_SIZE") {
                    return res.status(413).json({
                        mensagem: "O arquivo não pode ultrapassar 10 MB."
                    });
                }

                return res.status(400).json({
                    mensagem: "Erro ao processar o arquivo."
                });
            }

            next();
        });

    },
    async (req, res) => {

        console.log("===== ENVIO DE MENSAGEM =====");
        console.log("Body:", req.body);
        console.log("Arquivo:", req.file);

        try {

            const remetente = req.usuario.id;
            const { destinatario, mensagem } = req.body;


            console.log("Remetente:", remetente);
            console.log("Destinatário:", destinatario);
            console.log("Mensagem:", mensagem);


            // Verifica se o destinatário foi enviado
            if (!destinatario) {
                return res.status(400).json({
                    mensagem: "Destinatário não informado."
                });
            }

            let nomeArquivo = null;
            let arquivoUrl = null;
            let tipoArquivo = null;

            // Caso tenha arquivo
            if (req.file) {


                console.log("Arquivo recebido!");
                console.log("Nome:", req.file.originalname);
                console.log("Tipo:", req.file.mimetype);
                console.log("Tamanho:", req.file.size);


                tipoArquivo = req.file.mimetype;

                // Cria um nome único para o arquivo
                const nomeArquivoStorage =
                    `${remetente}-${Date.now()}-${req.file.originalname}`;

                    nomeArquivo = nomeArquivoStorage;


                console.log("Nome no Storage:", nomeArquivoStorage);


                // Envia para o bucket "anexos"
                const { error: erroUpload } = await supabase.storage
                    .from("anexos")
                    .upload(nomeArquivoStorage, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false
                    });

                if (erroUpload) {


                console.log("ERRO NO UPLOAD:");
                console.log(erroUpload);    


                    return res.status(500).json({
                        mensagem: "Erro ao enviar o arquivo.",
                        error: erroUpload.message
                    });
                }


                console.log("Upload realizado com sucesso!");


                // Pega a URL pública do arquivo
                const { data: urlData } = supabase.storage
                    .from("anexos")
                    .getPublicUrl(nomeArquivoStorage);

                arquivoUrl = urlData.publicUrl;


                console.log("URL:", arquivoUrl);
            }

                console.log("Tentando salvar mensagem no banco...");

            // Cria a mensagem no banco
            const { data, error } = await supabase
                .from("mensagens")
                .insert([{
                    cod_remetente: remetente,
                    cod_destinatario: destinatario,
                    mensagem: mensagem || null,
                    nome_arquivo: nomeArquivo,
                    arquivo_url: arquivoUrl,
                    tipo_arquivo: tipoArquivo
                }])
                .select()
                .single();

            if (error) {

                console.log("ERRO AO SALVAR MENSAGEM:");
                console.log(error);

                return res.status(500).json({
                    mensagem: "Erro ao salvar mensagem.",
                    error: error.message
                });
            }


            console.log("Mensagem salva com sucesso!");


            return res.status(201).json(data);

        } catch (error) {

            //console.log(error); VOLTAR ESSE QUANDO REMOVER OS OUTROS CONSOLE LOG

            console.log("ERRO GERAL:");
            console.log(error);

            return res.status(500).json({
                mensagem: "Erro interno ao enviar mensagem.",
                error: error.message
            });

        }

    });




//Rota para carregar mensagens
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



//Rota para excluir mensagem selecionada
router.delete('/mensagens/:id', auth, async (req, res) => {

    try {

        const idMensagem = Number(req.params.id);
        const meuId = req.usuario.id;

        // Busca a mensagem
        const { data: mensagem, error: erroBusca } = await supabase
            .from('mensagens')
            .select('cod_mensagem, cod_remetente, nome_arquivo')
            .eq('cod_mensagem', idMensagem)
            .single();

        if (erroBusca || !mensagem) {
            return res.status(404).json({
                mensagem: "Mensagem não encontrada."
            });
        }

        // Verifica se a mensagem pertence ao usuário
        if (mensagem.cod_remetente !== meuId) {
            return res.status(403).json({
                mensagem: "Você não pode excluir essa mensagem."
            });
        }

        // Se tiver arquivo, remove do Storage
        if (mensagem.nome_arquivo) {

            const { error: erroArquivo } = await supabase.storage
                .from("anexos")
                .remove([mensagem.nome_arquivo]);

            if (erroArquivo) {
                console.log("Erro ao excluir arquivo:", erroArquivo);

                return res.status(500).json({
                    mensagem: "Erro ao excluir o arquivo do Storage.",
                    error: erroArquivo.message
                });
            }
        }

        // Exclui a mensagem do banco
        const { error: erroDelete } = await supabase
            .from('mensagens')
            .delete()
            .eq('cod_mensagem', idMensagem);

        if (erroDelete) {

            console.log("Erro ao excluir mensagem:", erroDelete);

            return res.status(500).json({
                mensagem: "Erro ao excluir mensagem.",
                error: erroDelete.message
            });
        }

        return res.status(200).json({
            mensagem: "Mensagem excluída com sucesso."
        });

    } catch (error) {

        console.log("Erro geral ao excluir mensagem:", error);

        return res.status(500).json({
            mensagem: "Erro interno ao excluir mensagem.",
            error: error.message
        });
    }

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


        // Verifica se existe bloqueio entre os usuários
            const bloqueado = await existeBloqueio(solicitante, destinatario);

            if (bloqueado) {
                return res.status(403).json({
                    mensagem: "Não é possível enviar um pedido de amizade para este usuário."
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

                // Busca os pedidos pendentes recebidos
                const { data: pedidos, error: erroPedidos } = await supabase
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

                if (erroPedidos) {
                    return res.status(500).json({
                        error: erroPedidos.message
                    });
                }


                // Busca todos os bloqueios envolvendo o usuário logado
                const { data: bloqueios, error: erroBloqueios } = await supabase
                    .from('bloqueios')
                    .select('usuario_bloqueador, usuario_bloqueado')
                    .or(
                        `usuario_bloqueador.eq.${meuId},usuario_bloqueado.eq.${meuId}`
                    );

                if (erroBloqueios) {
                    return res.status(500).json({
                        error: erroBloqueios.message
                    });
                }


                // Descobre quais usuários estão bloqueados com relação ao usuário logado
                const usuariosBloqueados = new Set();

                bloqueios.forEach((bloqueio) => {

                    if (Number(bloqueio.usuario_bloqueador) === Number(meuId)) {
                        usuariosBloqueados.add(Number(bloqueio.usuario_bloqueado));
                    }

                    if (Number(bloqueio.usuario_bloqueado) === Number(meuId)) {
                        usuariosBloqueados.add(Number(bloqueio.usuario_bloqueador));
                    }

                });


                // Remove pedidos de usuários bloqueados
                const pedidosFiltrados = pedidos.filter((pedido) => {
                    return !usuariosBloqueados.has(
                        Number(pedido.usuario_solicitante)
                    );
                });


                return res.status(200).json({
                    pedidos: pedidosFiltrados
                });


            } catch (error) {

                console.log(error);

                return res.status(500).json({
                    mensagem: "Erro interno ao buscar pedidos de amizade."
                });
            }

        });


    //Rota para ACEITAR pedidos de amizades(APENAS PARA O USUARIO LOGADO)
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


       


        // Verifica se existe bloqueio entre os usuários
        const bloqueado = await existeBloqueio(meuId, pedido.usuario_solicitante);

            if (bloqueado) {
                return res.status(403).json({
                    mensagem: "Não é possível aceitar este pedido."
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



    //Rota para RECUSAR pedidos de amizades(APENAS PARA O USUARIO LOGADO)
    router.put('/amizades/:id/recusar', auth, async (req, res) => {

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

        // Recusa o pedido
        const { data, error } = await supabase
            .from('amizades')
            .update({
                status: 'recusado'
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
            mensagem: "Pedido de amizade recusado.",
            amizade: data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            mensagem: "Erro interno ao recusar pedido de amizade."
        });
    }

});




    // Rota para REMOVER amizade
    router.delete('/amizades/:id', auth, async (req, res) => {

        try {

            const meuId = req.usuario.id;
            const outroUsuarioId = req.params.id;

            // Procura a amizade entre os dois usuários
            const { data: amizade, error: erroBusca } = await supabase
                .from('amizades')
                .select('id')
                .or(
                    `and(usuario_solicitante.eq.${meuId},usuario_destinatario.eq.${outroUsuarioId}),and(usuario_solicitante.eq.${outroUsuarioId},usuario_destinatario.eq.${meuId})`
                )
                .eq('status', 'aceito')
                .maybeSingle();

            if (erroBusca) {
                return res.status(500).json({
                    error: erroBusca.message
                });
            }

            if (!amizade) {
                return res.status(404).json({
                    mensagem: "Amizade não encontrada."
                });
            }

            // Remove a amizade
            const { error: erroDelete } = await supabase
                .from('amizades')
                .delete()
                .eq('id', amizade.id);

            if (erroDelete) {
                return res.status(500).json({
                    error: erroDelete.message
                });
            }

            return res.status(200).json({
                mensagem: "Amizade removida com sucesso."
            });

        } catch (error) {

            console.log(error);

            return res.status(500).json({
                mensagem: "Erro interno ao remover amizade."
            });
        }

    });




    //Rota para Listar Amizades
    router.get('/amizades', auth, async (req, res) => {

    try {

        const meuId = req.usuario.id;

        // Busca todas as amizades aceitas das quais o usuário participa
        const { data: amizades, error } = await supabase
            .from('amizades')
            .select('*')
            .or(`usuario_solicitante.eq.${meuId},usuario_destinatario.eq.${meuId}`)
            .eq('status', 'aceito');

        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }

        // Descobre o ID do outro usuário em cada amizade
        const idsAmigos = amizades.map((amizade) => {

            if (Number(amizade.usuario_solicitante) === Number(meuId)) {
                return amizade.usuario_destinatario;
            }

            return amizade.usuario_solicitante;

        });

        // Se não tiver amigos
        if (idsAmigos.length === 0) {
            return res.status(200).json({
                amigos: []
            });
        }

        // Busca os dados dos amigos
        const { data: amigos, error: erroUsuarios } = await supabase
            .from('usuarios')
            .select('id, nome_usuario, email_usuario, cargo, foto_perfil')
            .in('id', idsAmigos);

        if (erroUsuarios) {
            return res.status(500).json({
                error: erroUsuarios.message
            });
        }

        return res.status(200).json({
            amigos
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            mensagem: "Erro interno ao buscar amigos."
        });
    }

});




    //ROTAS DE BLOQUEIOS

    // Bloquear usuário
    router.post('/bloqueios/:id', auth, async (req, res) => {

        try {

            const meuId = req.usuario.id;
            const usuarioBloqueado = req.params.id;

            // Não pode bloquear a si mesmo
            if (Number(meuId) === Number(usuarioBloqueado)) {
                return res.status(400).json({
                    mensagem: "Você não pode bloquear a si mesmo."
                });
            }

            // Verifica se o usuário existe
            const { data: usuario, error: erroUsuario } = await supabase
                .from('usuarios')
                .select('id')
                .eq('id', usuarioBloqueado)
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

            // Verifica se já está bloqueado
            const { data: bloqueioExistente, error: erroBloqueio } = await supabase
                .from('bloqueios')
                .select('id')
                .eq('usuario_bloqueador', meuId)
                .eq('usuario_bloqueado', usuarioBloqueado)
                .maybeSingle();

            if (erroBloqueio) {
                return res.status(500).json({
                    error: erroBloqueio.message
                });
            }

            if (bloqueioExistente) {
                return res.status(409).json({
                    mensagem: "Este usuário já está bloqueado."
                });
            }

            // Cria o bloqueio
            const { data, error } = await supabase
                .from('bloqueios')
                .insert([{
                    usuario_bloqueador: meuId,
                    usuario_bloqueado: usuarioBloqueado
                }])
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            // Remove qualquer amizade ou pedido existente entre os dois
            const { error: erroAmizade } = await supabase
                .from('amizades')
                .delete()
                .or(
                    `and(usuario_solicitante.eq.${meuId},usuario_destinatario.eq.${usuarioBloqueado}),and(usuario_solicitante.eq.${usuarioBloqueado},usuario_destinatario.eq.${meuId})`
                );

            if (erroAmizade) {
                return res.status(500).json({
                    error: erroAmizade.message
                });
            }

            return res.status(201).json({
                mensagem: "Usuário bloqueado com sucesso.",
                bloqueio: data
            });

        } catch (error) {

            console.log(error);

            return res.status(500).json({
                mensagem: "Erro interno ao bloquear usuário."
            });
        }
    });


    
    //Rota para Desbloquear usuário
        router.delete('/bloqueios/:id', auth, async (req, res) => {

            try {

                const meuId = req.usuario.id;
                const usuarioDesbloqueado = req.params.id;

                const { data: bloqueio, error: erroBusca } = await supabase
                    .from('bloqueios')
                    .select('id')
                    .eq('usuario_bloqueador', meuId)
                    .eq('usuario_bloqueado', usuarioDesbloqueado)
                    .maybeSingle();

                if (erroBusca) {
                    return res.status(500).json({
                        error: erroBusca.message
                    });
                }

                if (!bloqueio) {
                    return res.status(404).json({
                        mensagem: "Bloqueio não encontrado."
                    });
                }

                const { error } = await supabase
                    .from('bloqueios')
                    .delete()
                    .eq('id', bloqueio.id);

                if (error) {
                    return res.status(500).json({
                        error: error.message
                    });
                }

                return res.status(200).json({
                    mensagem: "Usuário desbloqueado com sucesso."
                });

            } catch (error) {

                console.log(error);

                return res.status(500).json({
                    mensagem: "Erro interno ao desbloquear usuário."
                });
            }
        });
        
        


        // Listar usuários bloqueados
            router.get('/bloqueios', auth, async (req, res) => {

                try {

                    const meuId = req.usuario.id;

                    // Busca os bloqueios feitos pelo usuário logado
                    const { data: bloqueios, error } = await supabase
                        .from('bloqueios')
                        .select(`
                            id,
                            usuario_bloqueador,
                            usuario_bloqueado,
                            data_criacao,
                            usuarios!bloqueios_usuario_bloqueado_fkey (
                                id,
                                nome_usuario,
                                email_usuario,
                                cargo,
                                foto_perfil
                            )
                        `)
                        .eq('usuario_bloqueador', meuId)
                        .order('data_criacao', { ascending: false });

                    if (error) {
                        return res.status(500).json({
                            error: error.message
                        });
                    }

                    return res.status(200).json({
                        bloqueados: bloqueios
                    });

                } catch (error) {

                    console.log(error);

                    return res.status(500).json({
                        mensagem: "Erro interno ao buscar usuários bloqueados."
                    });
                }

            });




export default router;
