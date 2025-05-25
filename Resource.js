const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['medical', 'shelter', 'food', 'water', 'rescue', 'transportation', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['human', 'material', 'facility'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: 'units'
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  status: {
    type: String,
    enum: ['available', 'in-transit', 'deployed', 'exhausted'],
    default: 'available'
  },
  owners: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  assignedToDisaster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Disaster'
  },
  specialRequirements: String,
  expiryDate: Date,
  contact: {
    name: String,
    phone: String,
    email: String
  },
  currentCapacity: {
    type: Number,
    default: 100  // as percentage
  },
  tracking: {
    active: {
      type: Boolean,
      default: false
    },
    lastUpdated: Date,
    currentLocation: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number]
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

ResourceSchema.index({ location: '2dsphere' });
ResourceSchema.index({ 'tracking.currentLocation': '2dsphere' });

module.exports = mongoose.model('Resource', ResourceSchema);
