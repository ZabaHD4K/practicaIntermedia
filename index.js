import express from 'express';
import UserRepository from './repositories/UserRepository.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createCompany } from './repositories/CompanyRepository.js';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import dotenv from 'dotenv';
import User from './models/User.js';

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

// Ruta para la página de cambio de contraseña (protegida)
app.get('/change-password', verifyToken, (req, res) => {
   res.render('change-password');
});

// Ruta para la página de login
app.get('/login-page', (req, res) => {
   res.render('index');
});

// Ruta para la página de logout/panel de usuario (protegida)
app.get('/user-panel', verifyToken, (req, res) => {
   res.render('logout');
});

// Endpoint para obtener información del usuario actual (protegido)
app.get('/api/user/info', verifyToken, async (req, res) => {
   try {
      const user = await User.findById(req.user.id, { 
         password: 0, 
         validationCode: 0, 
         validationCodeExpires: 0 
      });
      if (!user) {
         return res.status(404).send({ error: 'Usuario no encontrado' });
      }
      res.json(user);
   } catch (error) {
      res.status(500).send({ error: 'Error al obtener información del usuario' });
   }
});

// Usuarios
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserRepository.login({ email, password });
        const token = jwt.sign(
            { id: user._id, email: user.email }, 
            process.env.JWT_SECRET || "SECRET_KEY", 
            { expiresIn: '1h' }
        );
        res.cookie('token', token, { httpOnly: true });
        res.send({ user, token });
    } catch (error) {
        res.status(401).send({ error: error.message });
    }
});

app.post('/register', async (req, res) => {
    const { email, password, nombre, apellidos, nif, direccion } = req.body;
    console.log(req.body);

    try {
        const result = await UserRepository.create({ 
            email, password, nombre, apellidos, nif, direccion 
        });
        
        // En un sistema real, aquí enviarías el código por email
        // Por ahora, solo devolvemos el código en la respuesta para pruebas
        res.status(201).send({ 
            id: result.id,
            message: 'Usuario registrado. Por favor valida tu cuenta con el código enviado a tu email.',
            validationCode: result.validationCode // En producción, no enviarías esto en la respuesta
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.put('/api/user/validation', async (req, res) => {
    const { email, code } = req.body;
    
    if (!email || !code) {
        return res.status(400).send({ 
            error: 'Se requiere email y código de validación' 
        });
    }
    
    try {
        const result = await UserRepository.validateUser({ email, code });
        res.status(200).send(result);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/api/user/resend-code', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).send({ error: 'Se requiere email' });
    }
    
    try {
        const result = await UserRepository.resendValidationCode(email);
        // En un sistema real, aquí enviarías el código por email
        res.status(200).send({ 
            message: 'Código de validación reenviado',
            validationCode: result.validationCode // En producción, no enviarías esto en la respuesta
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Nuevo endpoint para cambiar la contraseña - Requiere autenticación
app.post('/api/user/change-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).send({ 
            error: 'Se requiere la contraseña actual y la nueva contraseña' 
        });
    }
    
    try {
        const result = await UserRepository.changePassword({ 
            userId: req.user.id, 
            currentPassword, 
            newPassword 
        });
        res.status(200).send(result);
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post('/logout', (req, res) => {
    res.clearCookie('token', { 
        httpOnly: true,
        path: '/'
    });
    res.status(200).json({ message: 'Sesión cerrada correctamente' });
});

app.get('/protected', verifyToken, async (req, res) => {
    try {
        const users = await User.find({}, { 
            password: 0, 
            validationCode: 0, 
            validationCodeExpires: 0 
        });
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