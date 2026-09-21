const DOMINIOS_PERMITIDOS = new Set([
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "yahoo.com",
    "proton.me",
    "protonmail.com",
    "zoho.com",
    "aol.com",
    "gmx.com",
]);


export function validarEmailPermitido(email) {

    if (!email || typeof email !== "string") {
        return { valido: false, motivo: "E-mail inválido." };
    }

    const emailLimpo = email.trim().toLowerCase();

    // precisa ter exatamente um "@"
    const partes = emailLimpo.split("@");

    if (partes.length !== 2) {
        return { valido: false, motivo: "E-mail inválido." };
    }

    const [usuario, dominio] = partes;

    if (!usuario) {
        return { valido: false, motivo: "E-mail inválido." };
    }

    if (!dominio) {
        return { valido: false, motivo: "E-mail inválido." };
    }

    // exige pelo menos um ponto no domínio 
    if (!dominio.includes(".")) {
        return { valido: false, motivo: "E-mail inválido." };
    }

    // checa a whitelist 
    if (!DOMINIOS_PERMITIDOS.has(dominio)) {
        return {
            valido: false,
            motivo: "Só aceitamos e-mails dos domínios: " +
                [...DOMINIOS_PERMITIDOS].join(", ")
        };
    }

    return { valido: true };
}