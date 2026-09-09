import { Filter } from "bad-words";

const filter = new Filter({
    placeHolder: "*"
});


// ======================================================
// PALAVRAS E ABREVIAÇÕES EM PORTUGUÊS
// (lista expandida — filtro 1: correspondência exata/com
//  fronteira de palavra, feita pela lib bad-words)
// ======================================================

const palavrasPortugues = [
    // --- básicas originais ---
    "arrombado", "arrombada", "babaca", "bosta", "boiola",
    "cacete", "caralho", "corno", "cu", "cuzão", "cuzao",
    "desgraçado", "desgracado", "fdp", "filho da puta",
    "filhodaputa", "foda", "foder", "fodase", "foda-se",
    "merda", "otário", "otario", "piranha", "porra", "puta",
    "puto", "vadia", "viado", "veado", "vagabundo", "vagabunda",

    // abreviações
    "fds", "vsf", "pqp", "tnc", "vtnc", "tmnc",

    // ofensas
    "idiota", "imbecil", "retardado", "retardada", "burro", "burra",

    // --- expansão (vulgaridades/xingamentos comuns) ---
    "anta", "arrombada", "babaca", "bacurinha", "baitola",
    "bichinha", "bichona", "bilau", "bixa", "boceta",
    "boceta-molhada", "bolcinha", "bolsinha", "boiolao",
    "boquete", "boquetes", "boqueteira", "boqueteiro",
    "brecheca", "brocha", "brochado", "broche", "broxa",
    "broxeira", "bucefula", "buceta", "bucetao", "bucetas",
    "bucetinha", "bucetona", "bunda", "bundao", "bundona",
    "cabra", "cabrao", "cachorra", "cachuleta", "cadela",
    "cafetao", "cafetina", "cagalhao", "carai", "caraio",
    "caralha", "caralhudo", "cassete", "cequelada", "chatico",
    "chavasca", "checheca", "chereca", "chibio", "chifrudo",
    "chimbica", "chupa-pau", "chupada", "chupador", "chupadora",
    "chupando", "chupeta", "chupetinha", "chupou", "comedor",
    "comedora", "comilona", "corna", "cornao", "corpao",
    "corpo-de-sereia", "crossdresser", "cuecao", "custozinha",
    "cuzao", "cuzinho", "dadeira", "debilmental",
    "delicia-de-corpo", "desgraca", "devassa", "devasso",
    "encoxada", "engolidor", "engolidora", "enrabadas",
    "enrustida", "enrustido", "escrota", "escrotinho", "escroto",
    "estuprador", "estupradora", "filhodaputa", "fornicada",
    "frescao", "fresco", "frescura", "fudendo", "fudido",
    "furustreca", "garota-de-programa", "garoto-de-programa",
    "gostosao", "gostosona", "gostozudas", "gozada", "gozadas",
    "gozar", "gozo", "greludas", "gulosinha", "jumento",
    "katchanga", "ladra", "ladrao", "lambeaba", "lambe-saco",
    "lambisgoia", "lamedor", "larapio", "lasciva", "lascivo",
    "lesbofetiche", "libidinosa", "libidinoso", "lixa-pica",
    "machona", "machorra", "masturbacao", "masturbar",
    "mede-rola", "megasex", "mela-pentelho", "meleca",
    "melequinha", "menage", "merdao", "meretriz", "metendo",
    "michê", "mijada", "mongoloide", "nojenta", "nojento",
    "panaca", "papa-duro", "pausudas", "pechereca", "pedofila",
    "pedofilo", "peidao", "peido", "peidorreiro", "peitao",
    "peitona", "peituda", "peitudas", "periquita", "pica",
    "pinto", "piranhao", "piranhuda", "piriguetes", "piroca",
    "pirocao", "pirocudo", "pirulito", "pitbitoca", "pitchbicha",
    "pithbicha", "pitibicha", "pitrica", "pixota",
    "pornografica", "pornografico", "prencheca", "prexeca",
    "priquita", "priquito", "proxeneta", "punheta", "punhetao",
    "punheteira", "punheteiro", "pussy", "putaria", "putinha",
    "putinha-de-luxo", "quenga", "rabao", "rabuda", "rabudas",
    "rameira", "rapariga", "saca-rola", "safada", "safadinha",
    "safadinho", "safado", "sapatao", "sapatona", "sequelada",
    "sexboys", "sexgatas", "siliconada", "sirica", "siririca",
    "siririquenta", "sotravesti", "suruba", "surubas", "taioba",
    "tarada", "tarado", "tchaca", "tcheca", "tchonga",
    "tchuchuca", "tchutchuca", "tesao", "tesuda", "tesudas",
    "tesudo", "tetinha", "tezao", "tezuda", "tezudo", "tgatas",
    "tobinha", "tomba-macho", "topsexy", "transa", "transando",
    "traveca", "travecas", "traveco", "travecos", "trepada",
    "trepadas", "vaca", "vacilao", "vadjaina", "vagabundao",
    "vagabundona", "vaginismo", "vajoca", "veiaca", "veiaco",
    "viadao", "viadinho", "xabasca", "xana", "xaninha",
    "xatico", "xavasca", "xebreca", "xereca", "xexeca",
    "xexelento", "xibio", "xoroca", "xota", "xota-molhada",
    "xotinha", "xoxota", "xoxotinha", "xulipa", "xumbrega",
    "xupaxota", "xupeta", "xupetinha", "pinto", "rola",
    "corno"
];

filter.addWords(...palavrasPortugues);


// ======================================================
// NORMALIZA UM TEXTO (troca leetspeak/símbolos por letras)
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
        .replace(/!/g, "i")
        .replace(/\(/g, "c")   // <- faltava: "(" costuma substituir "c"
        .replace(/\|/g, "i");  // <- faltava: "|" costuma substituir "i"
}


// ======================================================
// CRIA UMA VERSÃO "LIMPA" PARA COMPARAÇÃO
// ======================================================

function normalizarParaComparacao(texto) {

    return normalizarTexto(texto)
        .replace(/[^a-z0-9]/g, "");
}


// ======================================================
// PRÉ-COMPILA OS PADRÕES DE DISFARCE (uma única vez,
// fora da função principal — isso é o que mais pesava
// na performance antes, pois recalculava tudo a cada
// mensagem enviada)
// ======================================================

// Tamanho mínimo para entrar no scanner de disfarces.
// Palavras muito curtas (ex: "cu") ficam só no filtro 1
// (bad-words, que já exige fronteira de palavra), porque
// no scanner de disfarces elas dariam muito falso positivo
// (ex.: "cu" apareceria dentro de "cuidado", "recurso" etc.)
const TAMANHO_MINIMO_DISFARCE = 4;

const padroesDisfarce = (() => {

    const vistos = new Set();
    const padroes = [];

    for (const palavra of palavrasPortugues) {

        const normalizada = normalizarParaComparacao(palavra);

        if (
            normalizada.length < TAMANHO_MINIMO_DISFARCE ||
            vistos.has(normalizada)
        ) {
            continue;
        }

        vistos.add(normalizada);

        // Cada letra vira "letra+", permitindo que o mesmo
        // caractere se repita (ex.: "puuuta", "safaadoo")
        // sem precisar mexer no mapeamento de posições.
        const padraoRegex = normalizada
            .split("")
            .map((letra) => `${letra}+`)
            .join("");

        padroes.push(new RegExp(padraoRegex, "g"));
    }

    return padroes;
})();


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

    const caracteres = [...resultado];

    let textoComparacao = "";
    const mapaPosicoes = [];

    for (let i = 0; i < caracteres.length; i++) {

        const normalizado = normalizarTexto(caracteres[i]);

        if (/^[a-z0-9]$/i.test(normalizado)) {
            textoComparacao += normalizado;
            mapaPosicoes.push(i);
        }
    }


    // ==================================================
    // 3. PROCURA CADA PADRÃO NA VERSÃO NORMALIZADA
    // ==================================================

    const palavrasDetectadas = [];

    for (const padrao of padroesDisfarce) {

        padrao.lastIndex = 0; // regex 'g' é stateful, precisa resetar

        let match;

        while ((match = padrao.exec(textoComparacao)) !== null) {

            const indiceInicial = match.index;
            const indiceFinal = indiceInicial + match[0].length - 1;

            palavrasDetectadas.push({
                inicio: mapaPosicoes[indiceInicial],
                fim: mapaPosicoes[indiceFinal]
            });

            // evita loop infinito em match de tamanho 0 (não deve
            // acontecer aqui, mas é uma proteção barata)
            if (match[0].length === 0) {
                padrao.lastIndex++;
            }
        }
    }


    // ==================================================
    // 4. SUBSTITUI SOMENTE OS PALAVRÕES ENCONTRADOS
    // ==================================================

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


    // ==================================================
    // 5. MONTA A MENSAGEM FINAL
    // ==================================================

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