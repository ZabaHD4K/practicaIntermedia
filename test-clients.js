import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Client from '../models/Client.js';
import ClientRepository from '../repositories/ClientRepository.js';
import connectDB from '../config/database.js';

describe('Clients API', () => {
  let connection;
  let testUser;
  let testCompany;
  let testClient;
  
  // Configuración antes de todas las pruebas
  beforeAll(async () => {
    // Conectar a la base de datos de prueba
    connection = await connectDB();
    
    // Limpiar datos de prueba
    await User.deleteMany({});
    await Company.deleteMany({});
    await Client.deleteMany({});
    
    // Crear usuario de prueba
    testUser = new User({
      email: 'test@example.com',
      password: 'password123',
      nombre: 'Test',
      apellidos: 'User',
      nif: 'TEST123',
      direccion: 'Test Address',
      isValidated: true
    });
    await testUser.save();
    
    // Crear compañía de prueba
    testCompany = new Company({
      nif: 'B12345678',
      nombre: 'Test Company',
      miembros: [testUser.email],
      jefe: testUser.email
    });
    await testCompany.save();
  });
  
  // Limpieza después de todas las pruebas
  afterAll(async () => {
    // Limpiar datos de prueba
    await User.deleteMany({});
    await Company.deleteMany({});
    await Client.deleteMany({});
    
    // Cerrar conexión a base de datos
    await mongoose.connection.close();
  });
  
  // Prueba de creación de cliente
  test('Crear un cliente', async () => {
    const clientData = {
      nombre: 'Test',
      apellidos: 'Client',
      email: 'client@example.com',
      telefono: '123456789',
      nif: 'CLIENT123',
      direccion: 'Client Address',
      creadorEmail: testUser.email,
      companiaId: testCompany._id.toString()
    };
    
    const result = await ClientRepository.create(clientData);
    
    // Guardar para usar en otras pruebas
    testClient = result;
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.nombre).toBe(clientData.nombre);
    expect(result.apellidos).toBe(clientData.apellidos);
    expect(result.email).toBe(clientData.email);
    expect(result.telefono).toBe(clientData.telefono);
    expect(result.nif).toBe(clientData.nif);
    expect(result.direccion).toBe(clientData.direccion);
    expect(result.creador).toBe(clientData.creadorEmail);
    expect(result.compania.toString()).toBe(clientData.companiaId);
    expect(result.activo).toBe(true);
  });
  
  // Prueba para obtener todos los clientes
  test('Obtener todos los clientes', async () => {
    const result = await ClientRepository.getAll();
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1); // Al menos el que hemos creado
  });
  
  // Prueba para obtener cliente por ID
  test('Obtener cliente por ID', async () => {
    const result = await ClientRepository.getById(testClient._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.nombre).toBe(testClient.nombre);
    expect(result.apellidos).toBe(testClient.apellidos);
    expect(result.email).toBe(testClient.email);
  });
  
  // Prueba para obtener clientes por creador
  test('Obtener clientes por creador', async () => {
    const result = await ClientRepository.getByCreador(testUser.email);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(client => client.creador === testUser.email)).toBe(true);
  });
  
  // Prueba para obtener clientes por compañía
  test('Obtener clientes por compañía', async () => {
    const result = await ClientRepository.getByCompania(testCompany._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(client => 
      client.compania.toString() === testCompany._id.toString()
    )).toBe(true);
  });
  
  // Prueba para actualizar un cliente
  test('Actualizar un cliente', async () => {
    const updateData = {
      telefono: '987654321',
      direccion: 'Updated Address'
    };
    
    const result = await ClientRepository.update(
      testClient._id,
      updateData,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.telefono).toBe(updateData.telefono);
    expect(result.direccion).toBe(updateData.direccion);
    // Verificar que otros campos no han cambiado
    expect(result.nombre).toBe(testClient.nombre);
    expect(result.apellidos).toBe(testClient.apellidos);
    expect(result.email).toBe(testClient.email);
    expect(result.nif).toBe(testClient.nif);
  });
  
  // Prueba para eliminar (desactivar) un cliente
  test('Eliminar un cliente', async () => {
    const result = await ClientRepository.delete(
      testClient._id,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Verificar que está marcado como inactivo
    const inactiveClient = await Client.findById(testClient._id);
    expect(inactiveClient).toBeDefined();
    expect(inactiveClient.activo).toBe(false);
  });
  
  // Prueba para verificar que clientes inactivos no aparecen en getAll
  test('Los clientes inactivos no aparecen en getAll', async () => {
    const result = await ClientRepository.getAll();
    
    // Verificar que el cliente eliminado no aparece
    expect(result.find(client => 
      client._id.toString() === testClient._id.toString()
    )).toBeUndefined();
  });
  
  // Prueba para crear un cliente con email duplicado (debe fallar)
  test('No se puede crear un cliente con email duplicado', async () => {
    const clientData = {
      nombre: 'Duplicate',
      apellidos: 'Client',
      email: testClient.email, // Email duplicado
      telefono: '123456789',
      nif: 'UNIQUE123',
      direccion: 'Another Address',
      creadorEmail: testUser.email
    };
    
    await expect(
      ClientRepository.create(clientData)
    ).rejects.toThrow(`Ya existe un cliente con el email: ${testClient.email}`);
  });
  
  // Prueba para crear un cliente con NIF duplicado (debe fallar)
  test('No se puede crear un cliente con NIF duplicado', async () => {
    const clientData = {
      nombre: 'Duplicate',
      apellidos: 'Client',
      email: 'unique@example.com', 
      telefono: '123456789',
      nif: testClient.nif, // NIF duplicado
      direccion: 'Another Address',
      creadorEmail: testUser.email
    };
    
    await expect(
      ClientRepository.create(clientData)
    ).rejects.toThrow(`Ya existe un cliente con el NIF: ${testClient.nif}`);
  });
});