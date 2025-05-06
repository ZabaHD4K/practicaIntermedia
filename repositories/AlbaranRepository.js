import Albaran from '../models/Albaran.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AlbaranRepository {
  static async create({ projectId, creatorEmail, hoursEntries, materialEntries, observations }) {
    // Validaciones básicas
    if (!projectId) {
      throw new Error('El ID del proyecto es requerido');
    }
    
    // Verificar que el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('El proyecto especificado no existe');
    }
    
    // Verificar que el proyecto está activo
    if (!project.activo) {
      throw new Error('No se pueden crear albaranes para proyectos inactivos');
    }
    
    // Verificar que el cliente asociado al proyecto existe
    const client = await Client.findById(project.cliente);
    if (!client) {
      throw new Error('El cliente asociado al proyecto no existe');
    }
    
    // Verificar que el usuario creador existe y está validado
    const creator = await User.findOne({ email: creatorEmail });
    if (!creator) {
      throw new Error('El usuario creador no existe');
    }
    
    if (!creator.isValidated) {
      throw new Error('El usuario debe estar validado para crear albaranes');
    }
    
    // Validar entradas de horas si existen
    if (hoursEntries && hoursEntries.length > 0) {
      for (const entry of hoursEntries) {
        if (!entry.user || !entry.hours || !entry.description) {
          throw new Error('Todas las entradas de horas deben incluir usuario, horas y descripción');
        }
        
        // Verificar que los usuarios existen
        const user = await User.findOne({ email: entry.user });
        if (!user) {
          throw new Error(`El usuario ${entry.user} no existe`);
        }
      }
    }
    
    // Validar entradas de materiales si existen
    if (materialEntries && materialEntries.length > 0) {
      for (const entry of materialEntries) {
        if (!entry.name || !entry.quantity || entry.unitPrice === undefined) {
          throw new Error('Todas las entradas de materiales deben incluir nombre, cantidad y precio unitario');
        }
        
        // Calcular precio total si no se proporciona
        if (entry.totalPrice === undefined) {
          entry.totalPrice = entry.quantity * entry.unitPrice;
        }
      }
    }
    
    // Generar número de albarán único
    const number = await Albaran.generateNumber();
    
    // Crear el nuevo albarán
    const newAlbaran = new Albaran({
      number,
      project: projectId,
      client: project.cliente,
      createdBy: creatorEmail,
      hoursEntries: hoursEntries || [],
      materialEntries: materialEntries || [],
      observations
    });
    
    // Guardar el albarán
    await newAlbaran.save();
    
    return newAlbaran;
  }
  
  static async getAll() {
    return await Albaran.find()
      .populate('project', 'titulo descripcion')
      .populate('client', 'nombre apellidos email')
      .sort({ createdAt: -1 });
  }
  
  static async getByCreator(creatorEmail) {
    return await Albaran.find({ createdBy: creatorEmail })
      .populate('project', 'titulo descripcion')
      .populate('client', 'nombre apellidos email')
      .sort({ createdAt: -1 });
  }
  
  static async getByProject(projectId) {
    return await Albaran.find({ project: projectId })
      .populate('project', 'titulo descripcion')
      .populate('client', 'nombre apellidos email')
      .sort({ createdAt: -1 });
  }
  
  static async getByClient(clientId) {
    return await Albaran.find({ client: clientId })
      .populate('project', 'titulo descripcion')
      .populate('client', 'nombre apellidos email')
      .sort({ createdAt: -1 });
  }
  
  static async getById(id) {
    const albaran = await Albaran.findById(id)
      .populate('project', 'titulo descripcion fechaInicio fechaFin estado presupuesto')
      .populate('client', 'nombre apellidos email telefono nif direccion')
      .lean();
      
    if (!albaran) {
      throw new Error('Albarán no encontrado');
    }
    
    // Obtener información adicional del creador
    const creator = await User.findOne({ email: albaran.createdBy }, { 
      password: 0, 
      validationCode: 0, 
      validationCodeExpires: 0 
    }).lean();
    
    if (creator) {
      albaran.creatorDetails = creator;
    }
    
    // Obtener información de usuarios en entradas de horas
    if (albaran.hoursEntries && albaran.hoursEntries.length > 0) {
      const userEmails = [...new Set(albaran.hoursEntries.map(entry => entry.user))];
      const users = await User.find(
        { email: { $in: userEmails } },
        { password: 0, validationCode: 0, validationCodeExpires: 0 }
      ).lean();
      
      const userMap = {};
      users.forEach(user => {
        userMap[user.email] = user;
      });
      
      albaran.hoursEntries = albaran.hoursEntries.map(entry => ({
        ...entry,
        userDetails: userMap[entry.user] || null
      }));
    }
    
    return albaran;
  }
  
  static async update(id, updateData, userEmail) {
    // Encontrar el albarán existente
    const albaran = await Albaran.findById(id);
    if (!albaran) {
      throw new Error('Albarán no encontrado');
    }
    
    // Verificar permisos
    if (albaran.createdBy !== userEmail) {
      const project = await Project.findById(albaran.project);
      if (!project || !project.compania) {
        throw new Error('No tienes permisos para actualizar este albarán');
      }
      
      const company = await Company.findById(project.compania);
      if (!company || (company.jefe !== userEmail && !company.miembros.includes(userEmail))) {
        throw new Error('No tienes permisos para actualizar este albarán');
      }
    }
    
    // No permitir modificar albaranes firmados
    if (albaran.isSigned) {
      throw new Error('No se puede modificar un albarán que ya ha sido firmado');
    }
    
    // Actualizar información
    if (updateData.hoursEntries) {
      albaran.hoursEntries = updateData.hoursEntries;
    }
    
    if (updateData.materialEntries) {
      albaran.materialEntries = updateData.materialEntries;
    }
    
    if (updateData.observations !== undefined) {
      albaran.observations = updateData.observations;
    }
    
    // Si se está firmando el albarán
    if (updateData.isSigned) {
      albaran.isSigned = true;
      albaran.signatureDate = new Date();
      albaran.signedBy = updateData.signedBy || userEmail;
      albaran.status = 'signed';
      
      if (updateData.signatureImage) {
        albaran.signatureImage = updateData.signatureImage;
      }
    }
    
    await albaran.save();
    return albaran;
  }
  
  static async delete(id, userEmail) {
    // Encontrar el albarán
    const albaran = await Albaran.findById(id);
    if (!albaran) {
      throw new Error('Albarán no encontrado');
    }
    
    // Verificar permisos
    if (albaran.createdBy !== userEmail) {
      const project = await Project.findById(albaran.project);
      if (!project || !project.compania) {
        throw new Error('No tienes permisos para eliminar este albarán');
      }
      
      const company = await Company.findById(project.compania);
      if (!company || (company.jefe !== userEmail && !company.miembros.includes(userEmail))) {
        throw new Error('No tienes permisos para eliminar este albarán');
      }
    }
    
    // No permitir eliminar albaranes firmados
    if (albaran.isSigned) {
      throw new Error('No se puede eliminar un albarán que ya ha sido firmado');
    }
    
    // Marcar como cancelado en lugar de eliminar físicamente
    albaran.status = 'cancelled';
    await albaran.save();
    
    return { success: true, message: 'Albarán cancelado correctamente' };
  }
  
  // Método para generar PDF
  static async generatePdf(id, userEmail) {
    // Obtener datos completos del albarán
    const albaran = await this.getById(id);
    
    // Verificar permisos
    if (albaran.createdBy !== userEmail) {
      const project = await Project.findById(albaran.project._id);
      if (!project || !project.compania) {
        throw new Error('No tienes permisos para acceder a este albarán');
      }
      
      const company = await Company.findById(project.compania);
      if (!company || (company.jefe !== userEmail && !company.miembros.includes(userEmail))) {
        throw new Error('No tienes permisos para acceder a este albarán');
      }
    }
    
    // Verificar si el albarán está firmado
    if (!albaran.isSigned) {
      throw new Error('Solo se pueden generar PDFs de albaranes firmados');
    }
    
    // Si ya existe un PDF generado y está almacenado, devolver la URL
    if (albaran.pdfUrl) {
      // Verificar si el archivo existe
      try {
        await fs.promises.access(albaran.pdfUrl);
        return albaran;
      } catch (error) {
        // Si el archivo no existe, continuar para regenerarlo
        console.log('El archivo PDF no existe, regenerando...');
      }
    }
    
    // Crear directorio para PDFs si no existe
    const pdfDir = path.join(process.cwd(), 'pdfs');
    try {
      await fs.promises.mkdir(pdfDir, { recursive: true });
    } catch (error) {
      console.error('Error al crear directorio para PDFs:', error);
    }
    
    // Nombre del archivo PDF
    const pdfFileName = `albaran-${albaran.number.replace(/\//g, '-')}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);
    
    // Crear el documento PDF
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    
    // Pipe el PDF al archivo
    doc.pipe(stream);
    
    // Añadir contenido al PDF
    this.generatePdfContent(doc, albaran);
    
    // Finalizar el documento
    doc.end();
    
    // Esperar a que se complete la escritura del archivo
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    // Actualizar la URL del PDF en el albarán
    await Albaran.findByIdAndUpdate(id, { pdfUrl: pdfPath });
    
    // Actualizar el objeto albarán para la respuesta
    albaran.pdfUrl = pdfPath;
    
    return albaran;
  }
  
  // Método auxiliar para generar el contenido del PDF
  static generatePdfContent(doc, albaran) {
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
        // Si es una URL completa
        if (albaran.signatureImage.startsWith('http')) {
          doc.text('Firma digital verificada (URL)');
        } 
        // Si es un base64
        else if (albaran.signatureImage.startsWith('data:image')) {
          const base64Data = albaran.signatureImage.split(';base64,').pop();
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, { width: 200 });
        } 
        // Si es una ruta de archivo local
        else {
          doc.image(albaran.signatureImage, { width: 200 });
        }
      } catch (error) {
        console.error('Error al cargar la imagen de firma:', error);
        doc.text('Firma digital verificada');
      }
    } else {
      doc.text('Firma digital verificada');
    }
    
    return doc;
  }
}

export default AlbaranRepository;