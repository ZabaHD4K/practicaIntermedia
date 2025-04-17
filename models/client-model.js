import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  apellidos: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  telefono: {
    type: String,
    required: true
  },
  nif: {
    type: String,
    required: true,
    unique: true
  },
  direccion: {
    type: String,
    required: true
  },
  creador: {
    type: String,
    required: true,
    ref: 'User'
  },
  compania: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  activo: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);

export default Client;