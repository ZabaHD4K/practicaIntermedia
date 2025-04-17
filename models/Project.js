import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  fechaInicio: {
    type: Date,
    required: true
  },
  fechaFin: {
    type: Date,
    required: true
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'En progreso', 'Completado', 'Cancelado'],
    default: 'Pendiente'
  },
  presupuesto: {
    type: Number,
    required: true
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  compania: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  creador: {
    type: String,
    required: true,
    ref: 'User'
  },
  activo: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;