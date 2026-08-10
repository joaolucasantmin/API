import express from 'express';
import dotenv from 'dotenv';
import publicRoutes from './routes/public.js';
import privateRoutes from './routes/private.js';
import cors from 'cors'

import auth from './middlewares/auth.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors()) //FUTURAMENTE COLOCAR A URL DO NOSSO SITE DENTRO DE: cors(URL AQUI  )

app.use('/API',publicRoutes);

//Essas rotas exigiram que o login tenha sido realizado
app.use('/API', auth, privateRoutes);

const PORT = process.env.PORT || 3000;

//Hospedando
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em ${PORT}`);
});
