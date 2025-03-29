import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userFilePath = path.join(__dirname, './db/User.json');
const companyFilePath = path.join(__dirname, './db/Company.json');

// Función para leer un archivo JSON
function readJSONFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Error leyendo el archivo ${filePath}:`, error.message);
        return [];
    }
}

// Función para crear una compañía
function createCompany(emailJefe, nif, nombre, miembros) {
    const users = readJSONFile(userFilePath);
    const companies = readJSONFile(companyFilePath);

    // Verificar si el NIF ya existe
    const existingCompany = companies.find(company => company.nif === nif);
    if (existingCompany) {
        throw new Error(`Ya existe una compañía con el NIF: ${nif}`);
    }

    // Verificar si el jefe existe
    const jefe = users.find(user => user.email === emailJefe);
    if (!jefe) {
        throw new Error('El jefe con el correo proporcionado no existe.');
    }

    // Crear la nueva compañía
    const newCompany = {
        _id: generateUUID(),
        nif,
        nombre,
        miembros,
        jefe: emailJefe
    };

    // Guardar la compañía en el archivo JSON
    companies.push(newCompany);
    fs.writeFileSync(companyFilePath, JSON.stringify(companies, null, 2), 'utf8');

    return newCompany;
}

// Función para generar un UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export { createCompany };