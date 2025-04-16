import express from 'express';
import UserRepository from './repositories/UserRepository.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createCompany } from './repositories/CompanyRepository.js';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import dotenv from 'dotenv';

// Configurar las variables de entorno
dotenv.config();

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conectar a MongoDB
connectDB();

const app = express();

// Configuración
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());

// Rutas
app.get('/', (req, res) => {
   res.send('inicio');
});

// usuarios
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserRepository.login({ email, password });
        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "SECRET_KEY", { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.send({ user, token });
    } catch (error) {
        res.status(401).send({ error: "usuario o contraseña incorrectos" });
    }
});

app.post('/register', async (req, res) => {
    const { email, password, nombre, apellidos, nif, direccion } = req.body;
    console.log(req.body);

    try {
        const id = await UserRepository.create({ email, password, nombre, apellidos, nif, direccion });
        res.send({ id });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.send('logout de usuarios');
});

app.get('/protected', verifyToken, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Excluir las contraseñas
        res.json(users);
    } catch (error) {
        res.status(500).send({ error: 'Error al obtener los usuarios' });
    }
});

// Middleware para verificar el token
function verifyToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({ error: 'No autorizado' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY', (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: 'No autorizado' });
        }
        req.user = decoded;
        next();
    });
}

// Compañía
app.post('/companies/create', async (req, res) => {
    const { emailJefe, nif, nombre, miembros } = req.body;

    try {
        const newCompany = await createCompany(emailJefe, nif, nombre, miembros);
        res.status(201).json(newCompany);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});