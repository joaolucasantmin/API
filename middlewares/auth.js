import jwt, { decode } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET

const auth = (req, res, next) =>{

    const token = req.headers.authorization

    console.log(token)

    if(!token){
        return res.status(401).json({
            message: 'Acesso Negado'

        });
    }

    try {
    const decoded = jwt.verify(
        token.replace("Bearer ", ""),
        JWT_SECRET
    );

    console.log("TOKEN DECODIFICADO:");
    console.log(decoded);

    req.usuario = decoded;

    next();

} catch (error) {

    console.log(error);

    return res.status(401).json({
        message: "Token inválido!"
    });

}

};

export default auth
