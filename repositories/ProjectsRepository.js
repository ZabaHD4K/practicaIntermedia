import Project from '../models/Project.js';
import Client from '../models/Client.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

class ProjectRepository {
  static async create({ titulo, descripcion, fechaInicio, fechaFin, estado, presupuesto, clienteId, companiaId, creadorEmail }) {
    // Validaciones básicas
    Validation.validateRequiredFields({ titulo, descripcion, fechaInicio, fechaFin, presupuesto, clienteId, creadorEmail });
    
    // Verificar que el cliente existe
    const cliente = await Client.findById(clienteId);
    if (!cliente) {
      throw new Error('El cliente especificado no existe');
    }
    
    // Verificar que el cliente está activo
    if (!cliente.activo) {
      throw new Error('El cliente está inactivo y no se pueden crear proyectos para él');
    }
    
    // Verificar que el usuario creador existe y está validado
    const usuario = await User.findOne({ email: creadorEmail });
    if (!usuario) {
      throw new Error('El usuario creador no existe');
    }
    
    if (!usuario.isValidated) {
      throw new Error('El usuario debe estar validado para crear proyectos');
    }
    
    // Verificar que la compañía existe, si se proporciona
    let compania = null;
    if (companiaId) {
      compania = await Company.findById(companiaId);
      if (!compania) {
        throw new Error('La compañía especificada no existe');
      }
      
      // Verificar que el usuario pertenece a la compañía
      if (compania.jefe !== creadorEmail && !compania.miembros.includes(creadorEmail)) {
        throw new Error('El usuario no pertenece a la compañía especificada');
      }
    }
    
    // Verificar que la fecha de inicio es anterior a la fecha de fin
    const inicioDate = new Date(fechaInicio);
    const finDate = new Date(fechaFin);
    if (inicioDate >= finDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    
    // Crear el nuevo proyecto
    const newProject = new Project({
      titulo,
      descripcion,
      fechaInicio: inicioDate,
      fechaFin: finDate,
      estado: estado || 'Pendiente',
      presupuesto,
      cliente: clienteId,
      compania: companiaId || null,
      creador: creadorEmail
    });
    
    // Guardar el proyecto en la base de datos
    await newProject.save();
    
    return newProject;
  }
  
  static async getAll() {
    return await Project.find({ activo: true })
      .populate('cliente', 'nombre apellidos email')
      .populate('compania', 'nombre');
  }
  
  static async getByCreador(creadorEmail) {
    return await Project.find({ creador: creadorEmail, activo: true })
      .populate('cliente', 'nombre apellidos email')
      .populate('compania', 'nombre');
  }
  
  static async getByCliente(clienteId) {
    return await Project.find({ cliente: clienteId, activo: true })
      .populate('cliente', 'nombre apellidos email')
      .populate('compania', 'nombre');
  }
  
  static async getByCompania(companiaId) {
    return await Project.find({ compania: companiaId, activo: true })
      .populate('cliente', 'nombre apellidos email')
      .populate('compania', 'nombre');
  }
  
  static async getById(projectId) {
    return await Project.findById(projectId)
      .populate('cliente', 'nombre apellidos email')
      .populate('compania', 'nombre');
  }
  
  static async update(projectId, updateData, creadorEmail) {
    // Obtener el proyecto existente
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    
    // Verificar que el usuario tiene permisos para actualizar este proyecto
    if (project.creador !== creadorEmail) {
      // Verificar si el usuario pertenece a la misma compañía que el proyecto
      if (project.compania) {
        const compania = await Company.findById(project.compania);
        if (!compania || (compania.jefe !== creadorEmail && !compania.miembros.includes(creadorEmail))) {
          throw new Error('No tienes permisos para actualizar este proyecto');
        }
      } else {
        throw new Error('No tienes permisos para actualizar este proyecto');
      }
    }
    
    // Si se está actualizando el cliente, verificar que existe
    if (updateData.clienteId) {
      const cliente = await Client.findById(updateData.clienteId);
      if (!cliente) {
        throw new Error('El cliente especificado no existe');
      }
      if (!cliente.activo) {
        throw new Error('El cliente está inactivo y no se puede asignar a este proyecto');
      }
      
      // Actualizar la referencia del cliente
      project.cliente = updateData.clienteId;
      delete updateData.clienteId; // Eliminar para no duplicar la actualización
    }
    
    // Si se está actualizando la compañía, verificar que existe
    if (updateData.companiaId) {
      if (updateData.companiaId === 'null' || updateData.companiaId === '') {
        project.compania = null;
      } else {
        const compania = await Company.findById(updateData.companiaId);
        if (!compania) {
          throw new Error('La compañía especificada no existe');
        }
        // Verificar que el usuario pertenece a la compañía
        if (compania.jefe !== creadorEmail && !compania.miembros.includes(creadorEmail)) {
          throw new Error('El usuario no pertenece a la compañía especificada');
        }
        
        project.compania = updateData.companiaId;
      }
      delete updateData.companiaId; // Eliminar para no duplicar la actualización
    }
    
    // Si se está actualizando las fechas, verificar que son válidas
    if (updateData.fechaInicio || updateData.fechaFin) {
      const inicioDate = updateData.fechaInicio ? new Date(updateData.fechaInicio) : project.fechaInicio;
      const finDate = updateData.fechaFin ? new Date(updateData.fechaFin) : project.fechaFin;
      
      if (inicioDate >= finDate) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }
      
      if (updateData.fechaInicio) project.fechaInicio = inicioDate;
      if (updateData.fechaFin) project.fechaFin = finDate;
      
      delete updateData.fechaInicio;
      delete updateData.fechaFin;
    }
    
    // Actualizar el resto de campos
    Object.keys(updateData).forEach(key => {
      project[key] = updateData[key];
    });
    
    await project.save();
    return project;
  }
  
  static async delete(projectId, userEmail) {
    // En lugar de eliminar, marcamos como inactivo
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    
    // Verificar permisos
    if (project.creador !== userEmail) {
      const compania = await Company.findById(project.compania);
      if (!compania || (compania.jefe !== userEmail && !compania.miembros.includes(userEmail))) {
        throw new Error('No tienes permisos para eliminar este proyecto');
      }
    }
    
    project.activo = false;
    await project.save();
    return { success: true, message: 'Proyecto eliminado correctamente' };
  }
}

class Validation {
  static validateRequiredFields(fields) {
    Object.keys(fields).forEach(key => {
      if (fields[key] === undefined || fields[key] === null || fields[key] === '') {
        throw new Error(`El campo ${key} es obligatorio`);
      }
    });
  }
}

export default ProjectRepository;