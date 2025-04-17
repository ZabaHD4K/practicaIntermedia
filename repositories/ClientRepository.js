import Client from '../models/Client.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

class ClientRepository {
  static async create({ nombre, apellidos, email, telefono, nif, direccion, creadorEmail, companiaId }) {
    // Validaciones básicas
    Validation.validateRequiredFields({ nombre, apellidos, email, telefono, nif, direccion, creadorEmail });
    Validation.validateEmail(email);
    
    // Verificar si el cliente ya existe
    const existingClient = await Client.findOne({ 
      $or: [
        { email: email },
        { nif: nif }
      ]
    });
    
    if (existingClient) {
      if (existingClient.email === email) {
        throw new Error(`Ya existe un cliente con el email: ${email}`);
      } else {
        throw new Error(`Ya existe un cliente con el NIF: ${nif}`);
      }
    }
    
    // Verificar que el usuario creador existe y está validado
    const usuario = await User.findOne({ email: creadorEmail });
    if (!usuario) {
      throw new Error('El usuario creador no existe');
    }
    
    if (!usuario.isValidated) {
      throw new Error('El usuario debe estar validado para crear clientes');
    }
    
    // Verificar que la compañía existe, si se proporciona
    if (companiaId) {
      const compania = await Company.findById(companiaId);
      if (!compania) {
        throw new Error('La compañía especificada no existe');
      }
      
      // Verificar que el usuario pertenece a la compañía
      if (compania.jefe !== creadorEmail && !compania.miembros.includes(creadorEmail)) {
        throw new Error('El usuario no pertenece a la compañía especificada');
      }
    }
    
    // Crear el nuevo cliente
    const newClient = new Client({
      nombre,
      apellidos,
      email,
      telefono,
      nif,
      direccion,
      creador: creadorEmail,
      compania: companiaId || null
    });
    
    // Guardar el cliente en la base de datos
    await newClient.save();
    
    return newClient;
  }
  
  static async getAll() {
    return await Client.find({ activo: true }).populate('compania', 'nombre');
  }
  
  static async getByCreador(creadorEmail) {
    return await Client.find({ creador: creadorEmail, activo: true }).populate('compania', 'nombre');
  }
  
  static async getByCompania(companiaId) {
    return await Client.find({ compania: companiaId, activo: true });
  }
  
  static async getById(clientId) {
    return await Client.findById(clientId).populate('compania', 'nombre');
  }
  
  static async update(clientId, updateData, creadorEmail) {
    // Obtener el cliente existente
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Cliente no encontrado');
    }
    
    // Verificar que el usuario tiene permisos para actualizar este cliente
    if (client.creador !== creadorEmail) {
      // Verificar si el usuario pertenece a la misma compañía que el cliente
      if (client.compania) {
        const compania = await Company.findById(client.compania);
        if (!compania || (compania.jefe !== creadorEmail && !compania.miembros.includes(creadorEmail))) {
          throw new Error('No tienes permisos para actualizar este cliente');
        }
      } else {
        throw new Error('No tienes permisos para actualizar este cliente');
      }
    }
    
    // Si se intenta actualizar el email o NIF, verificar que no exista otro cliente con esos datos
    if (updateData.email && updateData.email !== client.email) {
      const existingClientEmail = await Client.findOne({ email: updateData.email });
      if (existingClientEmail) {
        throw new Error(`Ya existe un cliente con el email: ${updateData.email}`);
      }
    }
    
    if (updateData.nif && updateData.nif !== client.nif) {
      const existingClientNif = await Client.findOne({ nif: updateData.nif });
      if (existingClientNif) {
        throw new Error(`Ya existe un cliente con el NIF: ${updateData.nif}`);
      }
    }
    
    // Actualizar el cliente
    Object.keys(updateData).forEach(key => {
      client[key] = updateData[key];
    });
    
    await client.save();
    return client;
  }
  
  static async delete(clientId, userEmail) {
    // En lugar de eliminar, marcamos como inactivo
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error('Cliente no encontrado');
    }
    
    // Verificar permisos
    if (client.creador !== userEmail) {
      const compania = await Company.findById(client.compania);
      if (!compania || (compania.jefe !== userEmail && !compania.miembros.includes(userEmail))) {
        throw new Error('No tienes permisos para eliminar este cliente');
      }
    }
    
    client.activo = false;
    await client.save();
    return { success: true, message: 'Cliente eliminado correctamente' };
  }
}

class Validation {
  static validateRequiredFields(fields) {
    Object.keys(fields).forEach(key => {
      if (!fields[key]) {
        throw new Error(`El campo ${key} es obligatorio`);
      }
    });
  }
  
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('El formato del email no es válido');
    }
  }
}

export default ClientRepository;