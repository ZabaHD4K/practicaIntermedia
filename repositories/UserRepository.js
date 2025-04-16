import User from '../models/User.js';

class UserRepository {
  static async create({ email, password, nombre, apellidos, nif, direccion }) {
    // Validaciones
    Validation.email(email);
    Validation.password(password);

    // Verificar si el correo ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('El correo ya existe');
    }

    // Crear el usuario (la encriptación se hace en el middleware pre-save)
    const user = new User({
      email,
      password,
      nombre,
      apellidos,
      nif,
      direccion,
      isValidated: false
    });

    // Generar código de validación antes de guardar
    const validationCode = user.generateValidationCode();
    
    await user.save();
    
    // Devolver el ID y el código de validación
    return {
      id: user._id,
      validationCode
    };
  }

  static async login({ email, password }) {
    // Validaciones
    Validation.email(email);
    Validation.password(password);

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('El usuario no existe');
    }

    // Verificar contraseña
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new Error('La contraseña no es correcta');
    }

    // Verificar si el usuario está validado
    if (!user.isValidated) {
      throw new Error('La cuenta no ha sido validada. Por favor, valida tu cuenta.');
    }

    // Excluir la contraseña del resultado
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.validationCode;
    delete userObject.validationCodeExpires;

    return userObject;
  }

  static async validateUser({ email, code }) {
    // Validar email
    Validation.email(email);
    
    // Buscar usuario
    const user = await User.findOne({ 
      email,
      validationCode: code,
      validationCodeExpires: { $gt: Date.now() } // Verificar que el código no ha expirado
    });

    if (!user) {
      throw new Error('Código de validación inválido o expirado');
    }

    // Actualizar usuario
    user.isValidated = true;
    user.validationCode = null;
    user.validationCodeExpires = null;
    
    await user.save();
    
    return { success: true, message: 'Usuario validado correctamente' };
  }

  static async resendValidationCode(email) {
    // Validar email
    Validation.email(email);
    
    // Buscar usuario
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('El usuario no existe');
    }
    
    if (user.isValidated) {
      throw new Error('El usuario ya está validado');
    }
    
    // Generar nuevo código
    const validationCode = user.generateValidationCode();
    await user.save();
    
    return { success: true, validationCode };
  }
  
  static async changePassword({ userId, currentPassword, newPassword }) {
    // Validar la nueva contraseña
    Validation.password(newPassword);
    
    // Buscar el usuario por ID
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Verificar que la contraseña actual es correcta
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('La contraseña actual es incorrecta');
    }
    
    // Verificar que la nueva contraseña no es igual a la actual
    if (currentPassword === newPassword) {
      throw new Error('La nueva contraseña debe ser diferente a la actual');
    }
    
    // Actualizar la contraseña
    user.password = newPassword;
    await user.save();
    
    return { success: true, message: 'Contraseña actualizada correctamente' };
  }
}

class Validation {
  static email(email) {
    if (typeof email !== 'string') {
      throw new Error('El email debe ser un string');
    }
    if (email.length < 4) {
      throw new Error('El email debe tener al menos 4 caracteres');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('El email no es válido');
    }
  }

  static password(password) {
    if (typeof password !== 'string') {
      throw new Error('El password debe ser un string');
    }
    if (password.length < 8) {
      throw new Error('El password debe tener al menos 8 caracteres');
    }
  }
}

export default UserRepository;