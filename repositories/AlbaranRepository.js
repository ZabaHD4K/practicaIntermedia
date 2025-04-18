import Albaran from '../models/Albaran.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

class AlbaranRepository {
  static async create({ projectId, creatorEmail, hoursEntries, materialEntries, observations }) {
    // Validaciones básicas
    if (!projectId) {
      throw new Error('El ID del proyecto es requerido');
    }
    
    
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('El proyecto especificado no existe');
    }
    
    // Verificar que el proyecto está activo
    if (!project.activo) {
      throw new Error('No se pueden crear albaranes para proyectos inactivos');
    }
    
    
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
    
    
    if (hoursEntries && hoursEntries.length > 0) {
      for (const entry of hoursEntries) {
        if (!entry.user || !entry.hours || !entry.description) {
          throw new Error('Todas las entradas de horas deben incluir usuario, horas y descripción');
        }
        
        
        const user = await User.findOne({ email: entry.user });
        if (!user) {
          throw new Error(`El usuario ${entry.user} no existe`);
        }
      }
    }
    
    
    if (materialEntries && materialEntries.length > 0) {
      for (const entry of materialEntries) {
        if (!entry.name || !entry.quantity || entry.unitPrice === undefined) {
          throw new Error('Todas las entradas de materiales deben incluir nombre, cantidad y precio unitario');
        }
        
        
        if (entry.totalPrice === undefined) {
          entry.totalPrice = entry.quantity * entry.unitPrice;
        }
      }
    }
    
    
    const number = await Albaran.generateNumber();
    
    
    const newAlbaran = new Albaran({
      number,
      project: projectId,
      client: project.cliente,
      createdBy: creatorEmail,
      hoursEntries: hoursEntries || [],
      materialEntries: materialEntries || [],
      observations
    });
    
    
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
    
    
    const creator = await User.findOne({ email: albaran.createdBy }, { 
      password: 0, 
      validationCode: 0, 
      validationCodeExpires: 0 
    }).lean();
    
    if (creator) {
      albaran.creatorDetails = creator;
    }
    
    
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
    
    const albaran = await Albaran.findById(id);
    if (!albaran) {
      throw new Error('Albarán no encontrado');
    }
    
    
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
    
    
    if (albaran.isSigned) {
      throw new Error('No se puede modificar un albarán que ya ha sido firmado');
    }
    
    
    if (updateData.hoursEntries) {
      albaran.hoursEntries = updateData.hoursEntries;
    }
    
    
    if (updateData.materialEntries) {
      albaran.materialEntries = updateData.materialEntries;
    }
    
    
    if (updateData.observations !== undefined) {
      albaran.observations = updateData.observations;
    }
    
    
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
    
    const albaran = await Albaran.findById(id);
    if (!albaran) {
      throw new Error('Albarán no encontrado');
    }
    
    
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
    
    
    if (albaran.isSigned) {
      throw new Error('No se puede eliminar un albarán que ya ha sido firmado');
    }
    
    
    albaran.status = 'cancelled';
    await albaran.save();
    
    return { success: true, message: 'Albarán cancelado correctamente' };
  }
  
  
  static async generatePdf(id, userEmail) {
    const albaran = await this.getById(id);
    
    
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
    
    return albaran;
  }
}

export default AlbaranRepository;