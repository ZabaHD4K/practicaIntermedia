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
  
  // Verificar si el jefe está validado
  if (!jefe.isValidated) {
    throw new Error('El jefe debe validar su cuenta antes de crear una compañía.');
  }

  // Verificar que todos los miembros existan y estén validados
  if (miembros && miembros.length > 0) {
    for (const miembroEmail of miembros) {
      const miembro = await User.findOne({ email: miembroEmail });
      if (!miembro) {
        throw new Error(`El miembro con el correo ${miembroEmail} no existe.`);
      }
      if (!miembro.isValidated) {
        throw new Error(`El miembro con el correo ${miembroEmail} debe validar su cuenta.`);
      }
    }
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