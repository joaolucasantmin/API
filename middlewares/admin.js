export default function admin(req, res, next) {

    if (req.usuario.cargo !== "admin") {
        return res.status(403).json({
            mensagem: "Acesso negado."
        });
    }

    next();
}