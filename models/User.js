import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  apellidos: {
    type: String,
    required: true
  },
  nif: {
    type: String,
    required: true
  },
  direccion: {
    type: String,
    required: true
  },
  isValidated: {
    type: Boolean,
    default: false
  },
  validationCode: {
    type: String,
    default: null
  },
  validationCodeExpires: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para generar código de validación
userSchema.methods.generateValidationCode = function() {
  // Generar código aleatorio de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Establecer el código y la fecha de expiración (1 hora)
  this.validationCode = code;
  this.validationCodeExpires = Date.now() + 3600000; // 1 hora en milisegundos
  
  return code;
};

// Middleware pre-save para encriptar la contraseña
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

export default User;