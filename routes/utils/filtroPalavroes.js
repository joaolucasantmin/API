import { Filter } from "bad-words";

const filter = new Filter({
    placeHolder: "*****"
});

// Palavras que você deseja bloquear.
// Coloque aqui sua lista de termos em português.
const palavrasPortugues = [
    // adicione sua lista aqui
];

// Adiciona a lista portuguesa ao filtro
filter.addWords(...palavrasPortugues);


// Normaliza o texto para dificultar burlas
function normalizarTexto(texto) {

    return texto
        .toLowerCase()

        // Remove acentos
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

        // Troca números frequentemente usados para substituir letras
        .replace(/0/g, "o")
        .replace(/1/g, "i")
        .replace(/3/g, "e")
        .replace(/4/g, "a")
        .replace(/5/g, "s")
        .replace(/7/g, "t")

        // Remove espaços/símbolos colocados entre letras
        .replace(/[\s._\-*]+/g, "");

}


// Verifica se existe alguma palavra proibida
export function contemPalavraProibida(texto) {

    if (!texto || typeof texto !== "string") {
        return false;
    }

    // Verificação normal
    if (filter.isProfane(texto)) {
        return true;
    }

    // Verificação normalizada
    const textoNormalizado = normalizarTexto(texto);

    return filter.isProfane(textoNormalizado);
}


// Retorna o texto censurado
export function filtrarPalavroes(texto) {

    if (!texto || typeof texto !== "string") {
        return texto;
    }

    // Primeiro filtra normalmente
    let resultado = filter.clean(texto);

    // Depois filtra a versão normalizada
    const normalizado = normalizarTexto(resultado);

    if (filter.isProfane(normalizado)) {
        return filter.clean(normalizado);
    }

    return resultado;
}