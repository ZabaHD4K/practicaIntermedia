import express from 'express';
import UserRepository from './repositories/UserRepository.js';
import ClientRepository from './repositories/ClientRepository.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createCompany } from './repositories/CompanyRepository.js';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import dotenv from 'dotenv';
import User from './models/User.js';
import Company from './models/Company.js';
import Client from './models/Client.js';
import ProjectRepository from './repositories/ProjectRepository.js';
import Project from './models/Project.js';
import AlbaranRepository from './repositories/AlbaranRepository.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';


import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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

// Endpoint para listar compañías disponibles para el usuario actual
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

// ===== INICIO NUEVOS ENDPOINTS PARA CLIENTES =====

// Endpoint para crear un cliente (protegido)
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

// Endpoint para listar todos los clientes (protegido)
app.get('/api/clients', verifyToken, async (req, res) => {
    try {
        const clients = await ClientRepository.getAll();
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

// Endpoint para listar clientes creados por el usuario actual (protegido)
app.get('/api/clients/me', verifyToken, async (req, res) => {
    try {
        const clients = await ClientRepository.getByCreador(req.user.email);
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

// Endpoint para obtener un cliente por ID (protegido)
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

// Endpoint para actualizar un cliente (protegido)
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

// Endpoint para eliminar un cliente (protegido)
app.delete('/api/clients/:id', verifyToken, async (req, res) => {
    try {
        const result = await ClientRepository.delete(req.params.id, req.user.email);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Endpoint similar a /protected pero para clientes
app.get('/clients-protected', verifyToken, async (req, res) => {
    try {
        const clients = await ClientRepository.getAll();
        res.render('clients', { clients }); // Renderiza una vista EJS
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
});

// ===== FIN NUEVOS ENDPOINTS PARA CLIENTES =====

// ===== INICIO NUEVOS ENDPOINTS PARA PROYECTOS =====

// Endpoint para crear un proyecto (protegido)
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

// Endpoint para listar todos los proyectos (protegido)
app.get('/api/projects', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getAll();
        res.json(projects);
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos' });
    }
});

// Endpoint para listar proyectos creados por el usuario actual (protegido)
app.get('/api/projects/me', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getByCreador(req.user.email);
        res.json(projects);
    } catch (error) {
        console.error('Error al obtener proyectos del usuario:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos' });
    }
});

// Endpoint para obtener proyectos por cliente (protegido)
app.get('/api/projects/client/:clientId', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getByCliente(req.params.clientId);
        res.json(projects);
    } catch (error) {
        console.error('Error al obtener proyectos por cliente:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos del cliente' });
    }
});

// Endpoint para obtener un proyecto por ID (protegido)
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

// Endpoint para actualizar un proyecto (protegido)
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

// Endpoint para eliminar un proyecto (protegido)
app.delete('/api/projects/:id', verifyToken, async (req, res) => {
    try {
        const result = await ProjectRepository.delete(req.params.id, req.user.email);
        res.json(result);
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        res.status(400).json({ error: error.message });
    }
});

// Endpoint similar a /protected pero para proyectos
app.get('/projects-protected', verifyToken, async (req, res) => {
    try {
        const projects = await ProjectRepository.getAll();
        res.render('projects', { projects }); // Renderiza una vista EJS
    } catch (error) {
        console.error('Error al obtener proyectos para vista:', error);
        res.status(500).json({ error: 'Error al obtener los proyectos' });
    }
});

// ===== FIN NUEVOS ENDPOINTS PARA PROYECTOS =====

// ===== INICIO NUEVOS ENDPOINTS PARA ALBARANES =====

// Endpoint para crear un albarán (protegido)
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

// Endpoint para listar todos los albaranes (protegido)
app.get('/api/albaranes', verifyToken, async (req, res) => {
  try {
    const albaranes = await AlbaranRepository.getAll();
    res.json(albaranes);
  } catch (error) {
    console.error('Error al obtener albaranes:', error);
    res.status(500).json({ error: 'Error al obtener los albaranes' });
  }
});

// Endpoint para obtener un albarán por ID (protegido)
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
    
    // Crear un nuevo documento PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Configurar cabecera para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=albaran-${albaran.number}.pdf`);
    
    // Enviar el PDF directamente al response
    doc.pipe(res);
    
    // Añadir contenido al PDF
    
    // Título y número de albarán
    doc.fontSize(20).text(`ALBARÁN ${albaran.number}`, { align: 'center' });
    doc.moveDown();
    
    // Fecha
    doc.fontSize(12).text(`Fecha: ${new Date(albaran.date).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();
    
    // Información del cliente
    doc.fontSize(14).text('DATOS DEL CLIENTE', { underline: true });
    doc.fontSize(12).text(`Nombre: ${albaran.client.nombre} ${albaran.client.apellidos}`);
    doc.text(`NIF: ${albaran.client.nif}`);
    doc.text(`Dirección: ${albaran.client.direccion}`);
    doc.text(`Email: ${albaran.client.email}`);
    doc.text(`Teléfono: ${albaran.client.telefono}`);
    doc.moveDown();
    
    // Información del proyecto
    doc.fontSize(14).text('DATOS DEL PROYECTO', { underline: true });
    doc.fontSize(12).text(`Título: ${albaran.project.titulo}`);
    doc.text(`Descripción: ${albaran.project.descripcion}`);
    doc.text(`Estado: ${albaran.project.estado}`);
    doc.moveDown();
    
    // Información del creador del albarán
    doc.fontSize(14).text('EMITIDO POR', { underline: true });
    if (albaran.creatorDetails) {
      doc.fontSize(12).text(`Nombre: ${albaran.creatorDetails.nombre} ${albaran.creatorDetails.apellidos}`);
      doc.text(`Email: ${albaran.creatorDetails.email}`);
    } else {
      doc.fontSize(12).text(`Email: ${albaran.createdBy}`);
    }
    doc.moveDown();
    
    // Detalles de horas trabajadas si existen
    if (albaran.hoursEntries && albaran.hoursEntries.length > 0) {
      doc.fontSize(14).text('HORAS TRABAJADAS', { underline: true });
      doc.moveDown(0.5);
      
      // Tabla de horas
      albaran.hoursEntries.forEach((entry, index) => {
        const userName = entry.userDetails ? 
          `${entry.userDetails.nombre} ${entry.userDetails.apellidos}` : 
          entry.user;
          
        doc.fontSize(11).text(`${index + 1}. ${userName} - ${entry.hours} horas`, { continued: true });
        doc.text(`   Fecha: ${new Date(entry.date).toLocaleDateString()}`, { align: 'right' });
        doc.fontSize(10).text(`   Descripción: ${entry.description}`);
        doc.moveDown(0.5);
      });
      
      doc.fontSize(12).text(`Total horas: ${albaran.totalHours}`, { align: 'right' });
      doc.moveDown();
    }
    
    // Detalles de materiales si existen
    if (albaran.materialEntries && albaran.materialEntries.length > 0) {
      doc.fontSize(14).text('MATERIALES', { underline: true });
      doc.moveDown(0.5);
      
      // Tabla de materiales
      albaran.materialEntries.forEach((entry, index) => {
        doc.fontSize(11).text(`${index + 1}. ${entry.name} - Cantidad: ${entry.quantity}`, { continued: true });
        doc.text(`   Precio: ${entry.unitPrice.toFixed(2)}€`, { align: 'right' });
        if (entry.description) {
          doc.fontSize(10).text(`   Descripción: ${entry.description}`);
        }
        doc.fontSize(11).text(`   Subtotal: ${entry.totalPrice.toFixed(2)}€`, { align: 'right' });
        doc.moveDown(0.5);
      });
      
      doc.fontSize(12).text(`Total materiales: ${albaran.totalMaterials.toFixed(2)}€`, { align: 'right' });
      doc.moveDown();
    }
    
    // Total general
    doc.fontSize(16).text(`TOTAL: ${albaran.totalAmount.toFixed(2)}€`, { align: 'right' });
    doc.moveDown();
    
    // Observaciones si existen
    if (albaran.observations) {
      doc.fontSize(14).text('OBSERVACIONES', { underline: true });
      doc.fontSize(12).text(albaran.observations);
      doc.moveDown();
    }
    
    // Información de firma
    doc.fontSize(14).text('FIRMA', { underline: true });
    doc.fontSize(12).text(`Firmado por: ${albaran.signedBy}`);
    doc.text(`Fecha de firma: ${new Date(albaran.signatureDate).toLocaleDateString()}`);
    
    // Añadir imagen de firma si existe
    if (albaran.signatureImage) {
      try {
        // Si es una URL o base64, habría que adaptarlo
        doc.image(albaran.signatureImage, { width: 200 });
      } catch (error) {
        console.error('Error al cargar la imagen de firma:', error);
        doc.text('Firma digital verificada');
      }
    } else {
      doc.text('Firma digital verificada');
    }
    
    // Finalizar el documento
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF del albarán:', error);
    res.status(500).json({ error: 'Error al generar el PDF del albarán' });
  }
});

// Endpoint para actualizar un albarán (protegido)
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

// Endpoint para eliminar (cancelar) un albarán (protegido)
app.delete('/api/albaranes/:id', verifyToken, async (req, res) => {
  try {
    const result = await AlbaranRepository.delete(req.params.id, req.user.email);
    res.json(result);
  } catch (error) {
    console.error('Error al eliminar albarán:', error);
    res.status(400).json({ error: error.message });
  }
});

// ===== FIN NUEVOS ENDPOINTS PARA ALBARANES =====

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});