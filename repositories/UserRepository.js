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
      direccion
    });

    await user.save();
    return user._id;
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

    // Excluir la contraseña del resultado
    const userObject = user.toObject();
    delete userObject.password;

    return userObject;
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