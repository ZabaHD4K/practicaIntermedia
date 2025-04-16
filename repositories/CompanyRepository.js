import Company from '../models/Company.js';
import User from '../models/User.js';

async function createCompany(emailJefe, nif, nombre, miembros) {
  // Verificar si el NIF ya existe
  const existingCompany = await Company.findOne({ nif });
  if (existingCompany) {
    throw new Error(`Ya existe una compañía con el NIF: ${nif}`);
  }

  // Verificar si el jefe existe
  const jefe = await User.findOne({ email: emailJefe });
  if (!jefe) {
    throw new Error('El jefe con el correo proporcionado no existe.');
  }

  // Crear la nueva compañía
  const newCompany = new Company({
    nif,
    nombre,
    miembros,
    jefe: emailJefe
  });

  // Guardar la compañía en la base de datos
  await newCompany.save();

  return newCompany;
}

export { createCompany };