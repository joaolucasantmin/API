import { Filter } from "bad-words";
import { palavrasPortugues, abreviacoes } from "./palavras.js";

const filter = new Filter({ placeHolder: "*" });


const listaNormalizada = new Set();

for (const palavra of palavrasPortugues) {

    const minuscula = palavra.toLowerCase();

    const semAcento = minuscula
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    listaNormalizada.add(minuscula);
    listaNormalizada.add(semAcento);
}

filter.addWords(...listaNormalizada);


function normalizarTexto(texto) {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
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
        .replace(/@/g, "a")
        .replace(/\$/g, "s")
        .replace(/!/g, "i")
        .replace(/\(/g, "c")
        .replace(/\|/g, "i");
}



function normalizarParaComparacao(texto) {

    return normalizarTexto(texto)
        .replace(/[^a-z0-9]/g, "");
}


// Palavras longas: separador OPCIONAL entre letras.
// Abreviações curtas: separador OBRIGATÓRIO entre letras
// (senão "cu" casaria dentro de "cuidado").
const SEP_OPCIONAL    = "[\\s\\.\\-_\\*\\|,;:!?@#\\$%&\\/\\\\()\\[\\]{}<>'\"`~^+=]*";
const SEP_OBRIGATORIO = "[\\s\\.\\-_\\*\\|,;:!?@#\\$%&\\/\\\\()\\[\\]{}<>'\"`~^+=]+";

function compilarPadroes(lista, minLen, separador) {

    const vistos = new Set();
    const padroes = [];

    for (const palavra of lista) {

        const normalizada = normalizarParaComparacao(palavra);

        if (normalizada.length < minLen || vistos.has(normalizada)) {
            continue;
        }

        vistos.add(normalizada);

        const corpo = normalizada
            .split("")
            .map((letra) => `${letra}+`)
            .join(separador);

        padroes.push(new RegExp(corpo, "g"));
    }

    return padroes;
}

const padroesDisfarce = [
    ...compilarPadroes(palavrasPortugues, 4, SEP_OPCIONAL),
    ...compilarPadroes(abreviacoes,      2, SEP_OBRIGATORIO),
];

export function filtrarPalavroes(texto) {

    if (!texto || typeof texto !== "string") {
        return texto;
    }

    let resultado = texto;


    resultado = filter.clean(resultado);


    const caracteres = [...resultado];

    let textoComparacao = "";
    const mapaPosicoes = [];

    for (let i = 0; i < caracteres.length; i++) {

        const normalizado = normalizarTexto(caracteres[i]);

        if (/^[a-z0-9]$/i.test(normalizado)) {
            textoComparacao += normalizado;
        } else {
            textoComparacao += " ";
        }

        mapaPosicoes.push(i);
    }



    const palavrasDetectadas = [];

    for (const padrao of padroesDisfarce) {

        padrao.lastIndex = 0;

        let match;

        while ((match = padrao.exec(textoComparacao)) !== null) {

            if (match[0].length === 0) {
                padrao.lastIndex++;
                continue;
            }

            const indiceInicial = match.index;
            const indiceFinal = indiceInicial + match[0].length - 1;

            if (
                indiceInicial < 0 ||
                indiceFinal >= mapaPosicoes.length
            ) {
                continue;
            }

            palavrasDetectadas.push({
                inicio: mapaPosicoes[indiceInicial],
                fim: mapaPosicoes[indiceFinal]
            });
        }
    }




    if (palavrasDetectadas.length === 0) {
        return resultado;
    }

    palavrasDetectadas.sort((a, b) => a.inicio - b.inicio);

    const intervalos = [];

    for (const intervalo of palavrasDetectadas) {

        const ultimo = intervalos[intervalos.length - 1];

        if (ultimo && intervalo.inicio <= ultimo.fim + 1) {
            ultimo.fim = Math.max(ultimo.fim, intervalo.fim);
        } else {
            intervalos.push({ inicio: intervalo.inicio, fim: intervalo.fim });
        }
    }



    let mensagemFinal = "";
    let posicaoAtual = 0;

    for (const intervalo of intervalos) {

        mensagemFinal += caracteres
            .slice(posicaoAtual, intervalo.inicio)
            .join("");

        const quantidadeCaracteres = intervalo.fim - intervalo.inicio + 1;
        mensagemFinal += "*".repeat(quantidadeCaracteres);

        posicaoAtual = intervalo.fim + 1;
    }

    mensagemFinal += caracteres.slice(posicaoAtual).join("");

    return mensagemFinal;
}