import mongoose from 'mongoose';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Albaran from '../models/Albaran.js';
import AlbaranRepository from '../repositories/AlbaranRepository.js';
import connectDB from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock para PDFDocument
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    return {
      pipe: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
  });
});

// Mock para fs.createWriteStream
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    createWriteStream: jest.fn().mockReturnValue({
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          callback();
        }
        return this;
      })
    }),
    promises: {
      ...originalFs.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined)
    }
  };
});

describe('Albaranes API', () => {
  let connection;
  let testUser;
  let testClient;
  let testProject;
  let testAlbaran;
  
  // Configuración antes de todas las pruebas
  beforeAll(async () => {
    // Conectar a la base de datos de prueba
    connection = await connectDB();
    
    // Limpiar datos de prueba
    await User.deleteMany({});
    await Client.deleteMany({});
    await Project.deleteMany({});
    await Albaran.deleteMany({});
    
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
    
    // Crear cliente de prueba
    testClient = new Client({
      nombre: 'Test',
      apellidos: 'Client',
      email: 'client@example.com',
      telefono: '123456789',
      nif: 'CLIENT123',
      direccion: 'Client Address',
      creador: testUser.email
    });
    await testClient.save();
    
    // Crear proyecto de prueba
    testProject = new Project({
      titulo: 'Test Project',
      descripcion: 'Project Description',
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días después
      estado: 'En progreso',
      presupuesto: 1000,
      cliente: testClient._id,
      creador: testUser.email
    });
    await testProject.save();
  });
  
  // Limpieza después de todas las pruebas
  afterAll(async () => {
    // Limpiar datos de prueba
    await User.deleteMany({});
    await Client.deleteMany({});
    await Project.deleteMany({});
    await Albaran.deleteMany({});
    
    // Cerrar conexión a base de datos
    await mongoose.connection.close();
  });
  
  // Prueba de creación de albarán
  test('Crear un albarán', async () => {
    const albaranData = {
      projectId: testProject._id.toString(),
      creatorEmail: testUser.email,
      hoursEntries: [
        {
          user: testUser.email,
          hours: 8,
          description: 'Test hours'
        }
      ],
      materialEntries: [
        {
          name: 'Test Material',
          quantity: 2,
          unitPrice: 10,
          totalPrice: 20,
          description: 'Test material description'
        }
      ],
      observations: 'Test observations'
    };
    
    const result = await AlbaranRepository.create(albaranData);
    
    // Guardar para usar en otras pruebas
    testAlbaran = result;
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.number).toBeDefined();
    expect(result.project.toString()).toBe(testProject._id.toString());
    expect(result.client.toString()).toBe(testClient._id.toString());
    expect(result.createdBy).toBe(testUser.email);
    expect(result.hoursEntries).toHaveLength(1);
    expect(result.materialEntries).toHaveLength(1);
    expect(result.observations).toBe('Test observations');
    expect(result.totalHours).toBe(8);
    expect(result.totalMaterials).toBe(20);
    expect(result.totalAmount).toBe(20);
    expect(result.isSigned).toBe(false);
    expect(result.status).toBe('draft');
  });
  
  // Prueba para obtener un albarán por ID
  test('Obtener un albarán por ID', async () => {
    const result = await AlbaranRepository.getById(testAlbaran._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.number).toBe(testAlbaran.number);
    expect(result.project._id.toString()).toBe(testProject._id.toString());
    expect(result.client._id.toString()).toBe(testClient._id.toString());
    expect(result.createdBy).toBe(testUser.email);
  });
  
  // Prueba para actualizar un albarán
  test('Actualizar un albarán', async () => {
    const updateData = {
      observations: 'Updated observations',
      hoursEntries: [
        {
          user: testUser.email,
          hours: 4,
          description: 'Updated hours'
        }
      ]
    };
    
    const result = await AlbaranRepository.update(
      testAlbaran._id,
      updateData,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.observations).toBe('Updated observations');
    expect(result.hoursEntries).toHaveLength(1);
    expect(result.hoursEntries[0].hours).toBe(4);
    expect(result.hoursEntries[0].description).toBe('Updated hours');
    expect(result.totalHours).toBe(4);
  });
  
  // Prueba para firmar un albarán
  test('Firmar un albarán', async () => {
    const updateData = {
      isSigned: true,
      signedBy: testUser.email,
      signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    };
    
    const result = await AlbaranRepository.update(
      testAlbaran._id,
      updateData,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.isSigned).toBe(true);
    expect(result.signedBy).toBe(testUser.email);
    expect(result.signatureImage).toBeDefined();
    expect(result.status).toBe('signed');
  });
  
  // Prueba para generar PDF
  test('Generar PDF de un albarán firmado', async () => {
    const result = await AlbaranRepository.generatePdf(
      testAlbaran._id,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.isSigned).toBe(true);
  });
  
  // Prueba para intentar eliminar un albarán firmado (debe fallar)
  test('No se puede eliminar un albarán firmado', async () => {
    await expect(
      AlbaranRepository.delete(testAlbaran._id, testUser.email)
    ).rejects.toThrow('No se puede eliminar un albarán que ya ha sido firmado');
  });
  
  // Prueba para crear un segundo albarán (para probar eliminación)
  test('Crear un segundo albarán para prueba de eliminación', async () => {
    const albaranData = {
      projectId: testProject._id.toString(),
      creatorEmail: testUser.email,
      hoursEntries: [
        {
          user: testUser.email,
          hours: 2,
          description: 'Test hours for deletion'
        }
      ],
      observations: 'Test observations for deletion'
    };
    
    const result = await AlbaranRepository.create(albaranData);
    
    // Guardar ID para la siguiente prueba
    testAlbaran.secondId = result._id;
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.isSigned).toBe(false);
    expect(result.status).toBe('draft');
  });
  
  // Prueba para eliminar un albarán no firmado
  test('Eliminar un albarán no firmado', async () => {
    const result = await AlbaranRepository.delete(
      testAlbaran.secondId,
      testUser.email
    );
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Verificar que se ha marcado como cancelado pero no eliminado
    const canceledAlbaran = await Albaran.findById(testAlbaran.secondId);
    expect(canceledAlbaran).toBeDefined();
    expect(canceledAlbaran.status).toBe('cancelled');
  });
  
  // Prueba para obtener todos los albaranes
  test('Obtener todos los albaranes', async () => {
    const result = await AlbaranRepository.getAll();
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2); // Al menos los dos que hemos creado
  });
  
  // Prueba para obtener albaranes por creador
  test('Obtener albaranes por creador', async () => {
    const result = await AlbaranRepository.getByCreator(testUser.email);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2); // Al menos los dos que hemos creado
    expect(result.every(albaran => albaran.createdBy === testUser.email)).toBe(true);
  });
  
  // Prueba para obtener albaranes por proyecto
  test('Obtener albaranes por proyecto', async () => {
    const result = await AlbaranRepository.getByProject(testProject._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2); // Al menos los dos que hemos creado
    expect(result.every(albaran => 
      albaran.project._id.toString() === testProject._id.toString() ||
      albaran.project.toString() === testProject._id.toString()
    )).toBe(true);
  });
  
  // Prueba para obtener albaranes por cliente
  test('Obtener albaranes por cliente', async () => {
    const result = await AlbaranRepository.getByClient(testClient._id);
    
    // Verificaciones
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2); // Al menos los dos que hemos creado
    expect(result.every(albaran => 
      albaran.client._id.toString() === testClient._id.toString() ||
      albaran.client.toString() === testClient._id.toString()
    )).toBe(true);
  });
});