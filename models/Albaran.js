import mongoose from 'mongoose';


const hoursEntrySchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    ref: 'User' 
  },
  hours: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});


const materialEntrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String
  }
});


const albaranSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'User'
  },
  date: {
    type: Date,
    default: Date.now
  },
  hoursEntries: [hoursEntrySchema],
  materialEntries: [materialEntrySchema],
  observations: {
    type: String
  },
  totalHours: {
    type: Number,
    default: 0
  },
  totalMaterials: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  isSigned: {
    type: Boolean,
    default: false
  },
  signatureDate: {
    type: Date
  },
  signedBy: {
    type: String
  },
  signatureImage: {
    type: String 
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'signed', 'cancelled'],
    default: 'draft'
  }
}, { timestamps: true });


albaranSchema.pre('save', function(next) {
  
  this.totalHours = this.hoursEntries.reduce((sum, entry) => sum + entry.hours, 0);
  
  
  this.totalMaterials = this.materialEntries.reduce((sum, entry) => sum + entry.totalPrice, 0);
  
  
  this.totalAmount = this.totalMaterials; 
  
  next();
});


albaranSchema.statics.generateNumber = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  return `ALB-${year}-${(count + 1).toString().padStart(5, '0')}`;
};

const Albaran = mongoose.model('Albaran', albaranSchema);

export default Albaran;
