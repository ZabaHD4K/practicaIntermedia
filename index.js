import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import PDFDocument from 'pdfkit';

// Configuración de variables de entorno
dotenv.config();

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importación de la conexión a la base de datos
import connectDB from './config/database.js';

// Importación de modelos
import User from './models/User.js';
import Company from './models/Company.js';
import Client from './models/Client.js';
import Project from './models/Project.js';
import Albaran from './models/Albaran.js';

// Importación de repositorios
import UserRepository from './repositories/UserRepository.js';
import { createCompany } from './repositories/CompanyRepository.js';
import ClientRepository from './repositories/ClientRepository.js';
import ProjectRepository from './repositories/ProjectRepository.js';
import AlbaranRepository from './repositories/AlbaranRepository.js';

// Importación de swagger para documentación
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// Inicializar Express
const app = express();

// Conexión a la base de datos
connectDB();

// Cargar la documentación de Swagger
try {
  const swaggerDocument = YAML.load('./swagger.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.error('Error al cargar el archivo swagger.yaml:', error);
}

// Configuración de Middleware
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());

// Middleware para verificar el token JWT
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

// Rutas para vistas
app.get('/', (req, res) => {
   res.send('Inicio de la aplicación');
});

app.get('/login-page', (req, res) => {
   res.render('index');
});

app.get('/user-panel', verifyToken, (req, res) => {
   res.render('logout');
});

app.get('/change-password', verifyToken, (req, res) => {
   res.render('change-password');
});

// API para usuarios
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

app.post('/register', async (req, res) => {
    const { email, password, nombre, apellidos, nif, direccion } = req.body;

    try {
        const result = await UserRepository.create({ 
            email, password, nombre, apellidos, nif, direccion 
        });
        
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
        res.status(200).send({ 
            message: 'Código de validación reenviado',
            validationCode: result.validationCode // En producción, no enviarías esto en la respuesta
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

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

// Ruta protegida de ejemplo
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

// API para compañías
app.post('/companies/create', async (req, res) => {
    const { emailJefe, nif, nombre, miembros } = req.body;

    try {
        const newCompany = await createCompany(emailJefe, nif, nombre, miembros);
        res.status(201).json(newCompany);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/companies', verifyToken, async (req, res) => {
    try {
        // Buscar compañías donde el usuario es jefe o miembro
        const companies = await Company.find({
            $or: [
                { jefe: req.user.email },
                { miembros: req.user.email }
            ]
        });
        
        res.json(companies);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las compañías' });
    }
});

// API para clientes
app.post('/api/clients', verifyToken, async (req, res) => {
    try {
        const { nombre, apellidos, email, telefono, nif, direccion, companiaId } = req.body;
        
        const newClient = await ClientRepository.create({
            nombre,
            apellidos,
            email,
            telefono,
            nif,
            direccion,
            creadorEmail: req.user.email,
            companiaId
        });
        
        res.status(201).json(newClient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/clients', verifyToken, async (req, res) => {
    try {
        const clients = await ClientRepository.getAll();
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

app.get('/api/clients/me', verifyToken, async (req, res) => {
    try {
        const clients = await ClientRepository.getByCreador(req.user.email);
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

app.get('/api/clients/:id', verifyToken, async (req, res) => {
    try {
        const client = await ClientRepository.getById(req.params.id);
        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el cliente' });
    }
});

app.put('/api/clients/:id', verifyToken, async (req, res) => {
    try {
        const updateData = req.body;
        const updatedClient = await ClientRepository.update(
            req.params.id,
            updateData,
            req.user.email
        );
        res.json(updatedClient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/clients/:id', verifyToken, async (req, res) => {
    try {
        const result = await ClientRepository.delete(req.params.id, req.user.email);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/clients-protected', verifyToken, async (req, res) => {
    try {
        const clients = await ClientRepository.getAll();
        res.render('clients', { clients }); // Renderiza una vista EJS
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

// API para proyectos
app.post('/api/projects', verifyToken, async (req, res) => {
    try {
        const { titulo, descripcion, fechaInicio, fechaFin, estado, presupuesto, clienteId, companiaId } = req.body;
        
        const newProject = await ProjectRepository.create({
            titulo,
            descripcion,
            fechaInicio,
            fechaFin,
            estado,
            presupuesto,
            clienteId,
            companiaId,
            creadorEmail: req.user.email
        });
        
        res.status(201).json(newProject);
    } catch (error) {
        console.error('Error en la creación del proyecto:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/projects', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getAll();
        res.json(projects);
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos' });
    }
});

app.get('/api/projects/me', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getByCreador(req.user.email);
        res.json(projects);
    } catch (error) {
        console.error('Error al obtener proyectos del usuario:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos' });
    }
});

app.get('/api/projects/client/:clientId', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getByCliente(req.params.clientId);
        res.json(projects);
    } catch (error) {
        console.error('Error al obtener proyectos por cliente:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos del cliente' });
    }
});

app.get('/api/projects/:id', verifyToken, async (req, res) => {
    try {
        const project = await ProjectRepository.getById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        res.json(project);
    } catch (error) {
        console.error('Error al obtener proyecto por ID:', error);
        res.status(500).json({ error: 'Error al obtener el proyecto' });
    }
});

app.put('/api/projects/:id', verifyToken, async (req, res) => {
    try {
        const updateData = req.body;
        const updatedProject = await ProjectRepository.update(
            req.params.id,
            updateData,
            req.user.email
        );
        res.json(updatedProject);
    } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/projects/:id', verifyToken, async (req, res) => {
    try {
        const result = await ProjectRepository.delete(req.params.id, req.user.email);
        res.json(result);
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/projects-protected', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getAll();
        res.render('projects', { projects }); // Renderiza una vista EJS
    } catch (error) {
        console.error('Error al obtener proyectos para vista:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos' });
    }
});

// API para albaranes
app.post('/api/albaranes', verifyToken, async (req, res) => {
  try {
    const { projectId, hoursEntries, materialEntries, observations } = req.body;
    
    const newAlbaran = await AlbaranRepository.create({
      projectId,
      creatorEmail: req.user.email,
      hoursEntries,
      materialEntries,
      observations
    });
    
    res.status(201).json(newAlbaran);
  } catch (error) {
    console.error('Error en la creación del albarán:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/albaranes', verifyToken, async (req, res) => {
  try {
    const albaranes = await AlbaranRepository.getAll();
    res.json(albaranes);
  } catch (error) {
    console.error('Error al obtener albaranes:', error);
    res.status(500).json({ error: 'Error al obtener los albaranes' });
  }
});

app.get('/api/albaranes/:id', verifyToken, async (req, res) => {
  try {
    const albaran = await AlbaranRepository.getById(req.params.id);
    if (!albaran) {
      return res.status(404).json({ error: 'Albarán no encontrado' });
    }
    res.json(albaran);
  } catch (error) {
    console.error('Error al obtener albarán por ID:', error);
    res.status(500).json({ error: 'Error al obtener el albarán' });
  }
});

// Endpoint para generar y descargar un albarán en PDF (protegido)
app.get('/api/albaranes/pdf/:id', verifyToken, async (req, res) => {
  try {
    const albaran = await AlbaranRepository.generatePdf(req.params.id, req.user.email);
    
    // Verificar si el albarán está firmado (solo se pueden generar PDFs de albaranes firmados)
    if (!albaran.isSigned) {
      return res.status(400).json({ error: 'Solo se pueden generar PDFs de albaranes firmados' });
    }
    
    // Verificar si ya existe un PDF generado
    if (albaran.pdfUrl && fs.existsSync(albaran.pdfUrl)) {
      // Enviar el archivo PDF existente
      return res.download(albaran.pdfUrl);
    }
    
    // Si no hay PDF o no existe el archivo, generar uno nuevo
    const pdfPath = `pdfs/albaran-${albaran.number.replace(/\//g, '-')}.pdf`;
    const fullPath = path.join(__dirname, pdfPath);
    
    // Crear directorio si no existe
    if (!fs.existsSync(path.join(__dirname, 'pdfs'))) {
      fs.mkdirSync(path.join(__dirname, 'pdfs'), { recursive: true });
    }
    
    // Crear un nuevo documento PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar cabecera para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=albaran-${albaran.number}.pdf`);
    
    // Pipe al archivo y a la respuesta
    const writeStream = fs.createWriteStream(fullPath);
    doc.pipe(writeStream);
    doc.pipe(res);
    
    // Generar contenido PDF
    AlbaranRepository.generatePdfContent(doc, albaran);
    
    // Finalizar el documento
    doc.end();
    
    // Actualizar URL del PDF en la base de datos
    await Albaran.findByIdAndUpdate(req.params.id, { pdfUrl: fullPath });
    
  } catch (error) {
    console.error('Error al generar PDF del albarán:', error);
    res.status(500).json({ error: 'Error al generar el PDF del albarán' });
  }
});

app.put('/api/albaranes/:id', verifyToken, async (req, res) => {
  try {
    const updateData = req.body;
    const updatedAlbaran = await AlbaranRepository.update(
      req.params.id,
      updateData,
      req.user.email
    );
    res.json(updatedAlbaran);
  } catch (error) {
    console.error('Error al actualizar albarán:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/albaranes/:id', verifyToken, async (req, res) => {
  try {
    const result = await AlbaranRepository.delete(req.params.id, req.user.email);
    res.json(result);
  } catch (error) {
    console.error('Error al eliminar albarán:', error);
    res.status(400).json({ error: error.message });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});