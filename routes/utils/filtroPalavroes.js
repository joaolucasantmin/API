import Filter from "bad-words";

const filter = new Filter({
    placeHolder: "*"
});


// ======================================================
// PALAVRAS E ABREVIAÇÕES EM PORTUGUÊS
// ======================================================

const palavrasPortugues = [
    "arrombado",
    "arrombada",
    "babaca",
    "bosta",
    "boiola",
    "cacete",
    "caralho",
    "corno",
    "cu",
    "cuzão",
    "cusao",
    "desgraçado",
    "desgracado",
    "fdp",
    "filho da puta",
    "filhodaputa",
    "foda",
    "foder",
    "fodase",
    "foda-se",
    "merda",
    "otário",
    "otario",
    "piranha",
    "porra",
    "puta",
    "puto",
    "vadia",
    "viado",
    "veado",
    "vagabundo",
    "vagabunda",

    // Abreviações
    "fds",
    "vsf",
    "pqp",
    "tnc",
    "vtnc",
    "tmnc",

    // Ofensas
    "idiota",
    "imbecil",
    "retardado",
    "retardada",
    "burro",
    "burra"
];

filter.addWords(...palavrasPortugues);


// ======================================================
// NORMALIZA UM TEXTO
// ======================================================

function normalizarTexto(texto) {

    return texto
        .toLowerCase()

        // Remove acentos
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

        // Troca números por letras
        .replace(/0/g, "o")
        .replace(/1/g, "i")
        .replace(/2/g, "z")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/5/g, "s")
        .replace(/6/g, "g")
        .replace(/7/g, "t")
        .replace(/8/g, "b")
        .replace(/9/g, "g")

        // Símbolos usados para substituir letras
        .replace(/@/g, "a")
        .replace(/\$/g, "s")
        .replace(/!/g, "i");
}


// ======================================================
// CRIA UMA VERSÃO "LIMPA" PARA COMPARAÇÃO
// ======================================================

function normalizarParaComparacao(texto) {

    return normalizarTexto(texto)
        .replace(/[^a-z0-9]/g, "");
}


// ======================================================
// FILTRO PRINCIPAL
// ======================================================

export function filtrarPalavroes(texto) {

    if (!texto || typeof texto !== "string") {
        return texto;
    }

    let resultado = texto;


    // ==================================================
    // 1. PRIMEIRO FILTRA PALAVRÕES ESCRITOS NORMALMENTE
    // ==================================================

    resultado = filter.clean(resultado);


    // ==================================================
    // 2. PROCURA PALAVRÕES DISFARÇADOS
    // ==================================================

    // Guarda os caracteres originais e suas posições
    const caracteres = [...resultado];

    let textoComparacao = "";
    let mapaPosicoes = [];

    for (let i = 0; i < caracteres.length; i++) {

        const original = caracteres[i];

        const normalizado = normalizarTexto(original);

        // Ignora símbolos e espaços na comparação
        if (/^[a-z0-9]$/i.test(normalizado)) {

            textoComparacao += normalizado;

            mapaPosicoes.push(i);
        }
    }


    // ==================================================
    // 3. PROCURA CADA PALAVRÃO NA VERSÃO NORMALIZADA
    // ==================================================

    const palavrasDetectadas = [];


    for (const palavra of palavrasPortugues) {

        const palavraNormalizada =
            normalizarParaComparacao(palavra);

        if (!palavraNormalizada) {
            continue;
        }

        let inicioBusca = 0;

        while (true) {

            const indice =
                textoComparacao.indexOf(
                    palavraNormalizada,
                    inicioBusca
                );

            if (indice === -1) {
                break;
            }


            // Posição inicial no texto original
            const posicaoInicial =
                mapaPosicoes[indice];

            // Posição final no texto original
            const ultimoIndice =
                indice + palavraNormalizada.length - 1;

            const posicaoFinal =
                mapaPosicoes[ultimoIndice];


            palavrasDetectadas.push({
                inicio: posicaoInicial,
                fim: posicaoFinal
            });


            inicioBusca =
                indice + palavraNormalizada.length;
        }
    }


    // ==================================================
    // 4. SUBSTITUI SOMENTE OS PALAVRÕES ENCONTRADOS
    // ==================================================

    if (palavrasDetectadas.length === 0) {
        return resultado;
    }


    // Ordena pelas posições
    palavrasDetectadas.sort(
        (a, b) => a.inicio - b.inicio
    );


    // Junta intervalos que se sobrepõem
    const intervalos = [];

    for (const intervalo of palavrasDetectadas) {

        const ultimo =
            intervalos[intervalos.length - 1];

        if (
            ultimo &&
            intervalo.inicio <= ultimo.fim + 1
        ) {

            ultimo.fim =
                Math.max(
                    ultimo.fim,
                    intervalo.fim
                );

        } else {

            intervalos.push({
                inicio: intervalo.inicio,
                fim: intervalo.fim
            });
        }
    }


    // ==================================================
    // 5. MONTA A MENSAGEM FINAL
    // ==================================================

    let mensagemFinal = "";

    let posicaoAtual = 0;


    for (const intervalo of intervalos) {

        // Mantém o texto antes do palavrão
        mensagemFinal +=
            caracteres
                .slice(
                    posicaoAtual,
                    intervalo.inicio
                )
                .join("");


        // Substitui somente o palavrão
        const quantidadeCaracteres =
            intervalo.fim - intervalo.inicio + 1;

        mensagemFinal +=
            "*".repeat(quantidadeCaracteres);


        posicaoAtual =
            intervalo.fim + 1;
    }


    // Mantém o restante da mensagem
    mensagemFinal +=
        caracteres
            .slice(posicaoAtual)
            .join("");


    return mensagemFinal;
}