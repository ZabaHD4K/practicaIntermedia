import fetch from 'node-fetch';
import readline from 'readline';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Configurar variables de entorno
dotenv.config();

// Configurar readline para entrada por consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para preguntar al usuario
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

// URL base para las peticiones
const BASE_URL = 'http://localhost:3000';

// Variables para almacenar datos importantes entre pasos
let userId = '';
let userEmail = '';
let userPassword = '';
let jwtToken = '';
let cookieJar = '';
let clientId = '';
let projectId = '';
let albaranId = '';

// Función para manejar las cookies
const saveCookies = (headers) => {
  const cookies = headers.get('set-cookie');
  if (cookies) {
    cookieJar = cookies;
    console.log('Cookies guardadas.');
  }
};

// Función para hacer peticiones con cookies
const fetchWithCookies = async (url, options = {}) => {
  if (cookieJar) {
    options.headers = {
      ...options.headers,
      'Cookie': cookieJar
    };
  }
  return fetch(url, options);
};

// Función principal que ejecuta todos los pasos del test
const runTest = async () => {
  try {
    console.log('====================================');
    console.log('INICIANDO TEST DE ALBARANES');
    console.log('====================================\n');
    
    // 1. Solicitar credenciales de usuario ya validado
    console.log('\n1. CONFIGURACIÓN INICIAL');
    console.log('------------------------------------');
    userEmail = await question('Ingrese email de un usuario ya validado: ');
    userPassword = await question('Ingrese contraseña del usuario: ');
    
    // 2. Iniciar sesión con el usuario
    console.log('\n2. INICIANDO SESIÓN');
    console.log('------------------------------------');
    let response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: userPassword })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al iniciar sesión: ${errorData.error || 'Error desconocido'}`);
    }
    
    // Guardar las cookies (contienen el token JWT)
    saveCookies(response.headers);
    
    let data = await response.json();
    console.log('✅ Sesión iniciada correctamente');
    console.log(`Usuario: ${data.user.nombre} ${data.user.apellidos}`);
    
    jwtToken = data.token;
    userId = data.user._id;
    
    // 3. Obtener proyectos disponibles para asociar al albarán
    console.log('\n3. OBTENIENDO PROYECTOS DISPONIBLES');
    console.log('------------------------------------');
    
    try {
      response = await fetchWithCookies(`${BASE_URL}/api/projects`);
      if (response.ok) {
        data = await response.json();
        if (data && data.length > 0) {
          console.log('✅ Proyectos disponibles:');
          data.forEach((project, index) => {
            console.log(`${index + 1}. ${project.titulo} (ID: ${project._id})`);
            if (project.cliente && typeof project.cliente === 'object') {
              console.log(`   Cliente: ${project.cliente.nombre} ${project.cliente.apellidos}`);
            }
          });
          
          const projectIndex = await question('Seleccione el número del proyecto a usar: ');
          if (projectIndex > 0 && projectIndex <= data.length) {
            projectId = data[projectIndex - 1]._id;
            clientId = data[projectIndex - 1].cliente._id || data[projectIndex - 1].cliente;
            console.log(`✅ Proyecto seleccionado: ${data[projectIndex - 1].titulo}`);
            
            // Verificar si la información del cliente está disponible
            if (data[projectIndex - 1].cliente && typeof data[projectIndex - 1].cliente === 'object') {
              console.log(`✅ Cliente asociado: ${data[projectIndex - 1].cliente.nombre} ${data[projectIndex - 1].cliente.apellidos}`);
            } else {
              console.log(`✅ Cliente ID: ${clientId}`);
            }
          } else {
            throw new Error('No se seleccionó ningún proyecto válido');
          }
        } else {
          throw new Error('No se encontraron proyectos disponibles');
        }
      } else {
        throw new Error('No se pudo acceder a los proyectos');
      }
    } catch (error) {
      console.log('❌ Error al obtener proyectos:', error.message);
      throw new Error('Se requiere al menos un proyecto para crear un albarán');
    }
    
    // 4. Crear un nuevo albarán
    console.log('\n4. CREANDO NUEVO ALBARÁN');
    console.log('------------------------------------');
    
    const timestamp = Date.now();
    
    // Preparar datos para el albarán
    const albaranData = {
      projectId: projectId,
      hoursEntries: [
        {
          user: userEmail,
          hours: 8,
          description: `Trabajo en el proyecto - ${timestamp}`
        }
      ],
      materialEntries: [
        {
          name: 'Material de prueba',
          quantity: 2,
          unitPrice: 15.50,
          totalPrice: 31.00,
          description: 'Material usado para pruebas'
        }
      ],
      observations: `Observaciones de prueba - Creado en test a las ${new Date().toLocaleString()}`
    };
    
    console.log('Datos del albarán a crear:');
    console.log(JSON.stringify(albaranData, null, 2));
    
    response = await fetchWithCookies(`${BASE_URL}/api/albaranes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albaranData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al crear albarán: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    albaranId = data._id;
    
    console.log('✅ Albarán creado correctamente');
    console.log(`ID del albarán: ${albaranId}`);
    console.log(`Número del albarán: ${data.number}`);
    
    // 5. Obtener todos los albaranes
    console.log('\n5. OBTENIENDO LISTA DE ALBARANES');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/albaranes`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener albaranes: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log(`✅ Se encontraron ${data.length} albaranes`);
    
    // 6. Obtener detalles del albarán creado
    console.log('\n6. OBTENIENDO DETALLES DEL ALBARÁN CREADO');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/albaranes/${albaranId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al obtener detalles del albarán: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Detalles del albarán:');
    console.log(`Número: ${data.number}`);
    console.log(`Proyecto: ${data.project ? data.project.titulo : 'No disponible'}`);
    console.log(`Cliente: ${data.client ? `${data.client.nombre} ${data.client.apellidos}` : 'No disponible'}`);
    console.log(`Total Horas: ${data.totalHours}`);
    console.log(`Total Materiales: ${data.totalMaterials.toFixed(2)}€`);
    console.log(`Total: ${data.totalAmount.toFixed(2)}€`);
    console.log(`Estado: ${data.status}`);
    console.log(`Firmado: ${data.isSigned ? 'Sí' : 'No'}`);
    
    // 7. Actualizar el albarán (añadir firma)
    console.log('\n7. ACTUALIZANDO ALBARÁN (FIRMA)');
    console.log('------------------------------------');
    
    const updateData = {
      isSigned: true,
      signedBy: userEmail,
      observations: `${data.observations || ''} - Firmado en prueba el ${new Date().toLocaleString()}`
    };
    
    console.log('Datos a actualizar:');
    console.log(JSON.stringify(updateData, null, 2));
    
    response = await fetchWithCookies(`${BASE_URL}/api/albaranes/${albaranId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al actualizar albarán: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Albarán actualizado correctamente (firmado)');
    console.log(`Estado: ${data.status}`);
    console.log(`Firmado por: ${data.signedBy}`);
    console.log(`Fecha de firma: ${new Date(data.signatureDate).toLocaleString()}`);
    
    // 8. Intentar descargar el PDF del albarán
    console.log('\n8. PROBANDO GENERACIÓN DE PDF');
    console.log('------------------------------------');
    
    console.log('Intentando descargar PDF del albarán...');
    
    response = await fetchWithCookies(`${BASE_URL}/api/albaranes/pdf/${albaranId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error al generar PDF:', errorText);
    } else {
      console.log('✅ PDF generado correctamente');
      
      // Guardar el PDF localmente (opcional)
      const pdfPath = path.join(process.cwd(), `albaran-${data.number || 'test'}.pdf`);
      const pdfBuffer = await response.buffer();
      
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log(`✅ PDF guardado localmente en: ${pdfPath}`);
    }
    
    // 9. Intentar eliminar el albarán (debería fallar al estar firmado)
    console.log('\n9. INTENTANDO ELIMINAR ALBARÁN FIRMADO');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/api/albaranes/${albaranId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      const deleteData = await response.json();
      console.log('Respuesta de eliminación:', deleteData);
      console.log('❓ La eliminación no debería funcionar en un albarán firmado');
    } else {
      const errorData = await response.json();
      console.log('✅ Error esperado al intentar eliminar un albarán firmado:');
      console.log(`Error: ${errorData.error || 'Error desconocido'}`);
    }
    
    // 10. Crear un segundo albarán (sin firmar) para probar eliminación
    console.log('\n10. CREANDO ALBARÁN ADICIONAL PARA PRUEBA DE ELIMINACIÓN');
    console.log('------------------------------------');
    
    const albaranData2 = {
      projectId: projectId,
      hoursEntries: [
        {
          user: userEmail,
          hours: 4,
          description: `Trabajo adicional - ${timestamp}`
        }
      ],
      observations: 'Albarán de prueba para eliminación'
    };
    
    response = await fetchWithCookies(`${BASE_URL}/api/albaranes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(albaranData2)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log(`❌ Error al crear albarán adicional: ${errorData.error || 'Error desconocido'}`);
    } else {
      data = await response.json();
      const albaran2Id = data._id;
      
      console.log('✅ Albarán adicional creado correctamente');
      console.log(`ID: ${albaran2Id}`);
      console.log(`Número: ${data.number}`);
      
      // 11. Eliminar el albarán adicional (sin firmar)
      console.log('\n11. ELIMINANDO ALBARÁN ADICIONAL (SIN FIRMAR)');
      console.log('------------------------------------');
      
      response = await fetchWithCookies(`${BASE_URL}/api/albaranes/${albaran2Id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log(`❌ Error al eliminar albarán: ${errorData.error || 'Error desconocido'}`);
      } else {
        data = await response.json();
        console.log('✅ Albarán eliminado (cancelado) correctamente');
        console.log(data);
      }
    }
    
    // 12. Cerrar sesión
    console.log('\n12. CERRANDO SESIÓN');
    console.log('------------------------------------');
    
    response = await fetchWithCookies(`${BASE_URL}/logout`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error al cerrar sesión: ${errorData.error || 'Error desconocido'}`);
    }
    
    data = await response.json();
    console.log('✅ Sesión cerrada correctamente');
    console.log(data);
    
    console.log('\n====================================');
    console.log('¡TEST DE ALBARANES COMPLETADO CON ÉXITO!');
    console.log('====================================');
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL TEST:', error.message);
  } finally {
    rl.close();
  }
};

// Ejecutar el test
runTest();