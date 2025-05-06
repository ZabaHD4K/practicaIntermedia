import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import ProjectRepository from '../repositories/ProjectRepository.js';
import connectDB from '../config/database.js';

describe('Projects API', () => {
  let connection;
  let testUser;
  let testCompany;
  let testClient;
  let testProject;
  
  // Configuración antes de todas las pruebas
  beforeAll(async () => {
    // Conectar a la base de datos de prueba
    connection = await connectDB();
    
    // Limpiar datos de prueba
    await User.deleteMany({});
    await Company.deleteMany({});
    await Client.deleteMany({});
    await Project.deleteMany({});
    
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
    
    // Crear cliente de prueba
    testClient = new Client({
      nombre: 'Test',
      apellidos: 'Client',
      email: 'client@example.com',
      telefono: '123456789',
      nif: 'CLIENT123',
      direccion: 'Client Address',
      creador: testUser.email,
      compania: testCompany._id
    });
    await testClient.save();
  });
  
  // Limpieza después de todas las pruebas
  afterAll(async () => {
    // Limpiar datos de prueba
    await User.deleteMany({});
    await Company.deleteMany({});
    await Client.deleteMany({});
    await Project.deleteMany({});
    
    // Cerrar conexión a base de datos
    await mongoose.connection.close();
  });
  
  // Prueba de creación de proyecto
  test('Crear un proyecto', async () => {
    const projectData = {
      titulo: 'Test Project',
      descripcion: 'Project Description',
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días después
      estado: 'En progreso',
      presupuesto: 1000,
      clienteId: testClient._id.toString(),
      companiaId: testCompany._id.toString(),
      creadorEmail: testUser.email
    };
    
    const result = await ProjectRepository.create(projectData);
    
    // Guardar para usar en otras pruebas
    testProject = result;
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.titulo).toBe(projectData.titulo);
    expect(result.descripcion).toBe(projectData.descripcion);
    expect(result.estado).toBe(projectData.estado);
    expect(result.presupuesto).toBe(projectData.presupuesto);
    expect(result.cliente.toString()).toBe(projectData.clienteId);
    expect(result.compania.toString()).toBe(projectData.companiaId);
    expect(result.creador).toBe(projectData.creadorEmail);
    expect(result.activo).toBe(true);
  });
  
  // Prueba para obtener todos los proyectos
  test('Obtener todos los proyectos', async () => {
    const result = await ProjectRepository.getAll();
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1); // Al menos el que hemos creado
  });
  
  // Prueba para obtener proyecto por ID
  test('Obtener proyecto por ID', async () => {
    const result = await ProjectRepository.getById(testProject._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.titulo).toBe(testProject.titulo);
    expect(result.descripcion).toBe(testProject.descripcion);
    expect(result.creador).toBe(testProject.creador);
  });
  
  // Prueba para obtener proyectos por creador
  test('Obtener proyectos por creador', async () => {
    const result = await ProjectRepository.getByCreador(testUser.email);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(project => project.creador === testUser.email)).toBe(true);
  });
  
  // Prueba para obtener proyectos por cliente
  test('Obtener proyectos por cliente', async () => {
    const result = await ProjectRepository.getByCliente(testClient._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(project => 
      project.cliente._id.toString() === testClient._id.toString() ||
      project.cliente.toString() === testClient._id.toString()
    )).toBe(true);
  });
  
  // Prueba para obtener proyectos por compañía
  test('Obtener proyectos por compañía', async () => {
    const result = await ProjectRepository.getByCompania(testCompany._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(project => 
      project.compania._id.toString() === testCompany._id.toString() ||
      project.compania.toString() === testCompany._id.toString()
    )).toBe(true);
  });
  
  // Prueba para actualizar un proyecto
  test('Actualizar un proyecto', async () => {
    const updateData = {
      titulo: 'Updated Project',
      estado: 'Completado',
      presupuesto: 1500
    };
    
    const result = await ProjectRepository.update(
      testProject._id,
      updateData,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.titulo).toBe(updateData.titulo);
    expect(result.estado).toBe(updateData.estado);
    expect(result.presupuesto).toBe(updateData.presupuesto);
    // Verificar que otros campos no han cambiado
    expect(result.descripcion).toBe(testProject.descripcion);
    expect(result.cliente.toString()).toBe(testProject.cliente.toString());
    expect(result.compania.toString()).toBe(testProject.compania.toString());
  });
  
  // Prueba para verificar validación de fechas
  test('No permite fechaInicio después de fechaFin', async () => {
    const fechaInicio = new Date();
    const fechaFin = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 día antes (inválido)
    
    const projectData = {
      titulo: 'Invalid Project',
      descripcion: 'Invalid dates',
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      estado: 'Pendiente',
      presupuesto: 1000,
      clienteId: testClient._id.toString(),
      creadorEmail: testUser.email
    };
    
    await expect(
      ProjectRepository.create(projectData)
    ).rejects.toThrow('La fecha de inicio debe ser anterior a la fecha de fin');
  });
  
  // Prueba para eliminar (desactivar) un proyecto
  test('Eliminar un proyecto', async () => {
    const result = await ProjectRepository.delete(
      testProject._id,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Verificar que está marcado como inactivo
    const inactiveProject = await Project.findById(testProject._id);
    expect(inactiveProject).toBeDefined();
    expect(inactiveProject.activo).toBe(false);
  });
  
  // Prueba para verificar que proyectos inactivos no aparecen en getAll
  test('Los proyectos inactivos no aparecen en getAll', async () => {
    const result = await ProjectRepository.getAll();
    
    // Verificar que el proyecto eliminado no aparece
    expect(result.find(project => 
      project._id.toString() === testProject._id.toString()
    )).toBeUndefined();
  });
  
  // Prueba para verificar acceso por compañía
  test('Usuario de la misma compañía puede actualizar proyecto', async () => {
    // Crear un nuevo usuario en la misma compañía
    const companyUser = new User({
      email: 'company@example.com',
      password: 'password123',
      nombre: 'Company',
      apellidos: 'User',
      nif: 'COMPANY123',
      direccion: 'Company Address',
      isValidated: true
    });
    await companyUser.save();
    
    // Añadir usuario a la compañía
    testCompany.miembros.push(companyUser.email);
    await testCompany.save();
    
    // Crear un nuevo proyecto
    const projectData = {
      titulo: 'Company Project',
      descripcion: 'Project for company access test',
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      estado: 'Pendiente',
      presupuesto: 2000,
      clienteId: testClient._id.toString(),
      companiaId: testCompany._id.toString(),
      creadorEmail: testUser.email
    };
    
    const newProject = await ProjectRepository.create(projectData);
    
    // Actualizar el proyecto con el usuario de la compañía
    const updateData = {
      titulo: 'Updated by Company User'
    };
    
    const result = await ProjectRepository.update(
      newProject._id,
      updateData,
      companyUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.titulo).toBe(updateData.titulo);
  });
});