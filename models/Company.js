import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  nif: {
    type: String,
    required: true,
    unique: true
  },
  nombre: {
    type: String,
    required: true
  },
  miembros: [{
    type: String
  }],
  jefe: {
    type: String,
    required: true
  }
}, { timestamps: true });

const Company = mongoose.model('Company', companySchema);

export default Company;