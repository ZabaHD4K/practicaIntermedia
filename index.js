import express from 'express';
import UserRepository from './UserRepository.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser'; // Importa cookie-parser
const app = express();

app.set('view engine', 'ejs'); // motor de plantillas

app.use(express.json()); // middleware para poder usar el request.body
app.use(cookieParser()); // Usa cookie-parser

app.get('/', (req, res) => {
   res.send('inicio');
});

// usuarios
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    try {
        const user = UserRepository.login({ email, password });
        const token = jwt.sign({ id: user._id, email: user.email }, "SECRET_KEY", { expiresIn: '1h' }); // creamos un token con la informacion del usuario, CON LA CLAVE SECRETA, y con una duracion de 1 hora
        res.cookie('token', token, { httpOnly: true }); // Almacena el token en las cookies
        res.send({ user, token }); // enviar el usuario y el token en un objeto
    } catch (error) {
        res.status(401).send({ error: "usuario o contraseña incorrectos" });
    }
});

app.post('/register',  async (req, res) => { // async para poder usar await
    const { email, password, nombre, apellidos, nif, direccion } = req.body;
    console.log(req.body);

    try {
        const id = await UserRepository.create({ email, password, nombre, apellidos, nif, direccion }); // usamos await para esperar a el hash
        res.send({ id });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/logout', (req, res) => {
    res.clearCookie('token'); // Borra la cookie del token al cerrar sesión
    res.send('logout de usuarios');
});

import path from 'path';

//vista de usuarios, esta protegida, sin token no se puede entrar
app.get('/protected', verifyToken, (req, res) => {
    const filePath = path.resolve('db/User.json');
    res.sendFile(filePath);
});

// Middleware para verificar el token
function verifyToken(req, res, next) {
    const token = req.cookies.token; // Obtén el token de las cookies
    if (!token) {
        return res.status(401).send({ error: 'No autorizado' });
    }

    jwt.verify(token, 'SECRET_KEY', (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: 'No autorizado' });
        }
        req.user = decoded;
        next();
    });
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});