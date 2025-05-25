const mongoose = require('mongoose');

const DisasterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['earthquake', 'flood', 'fire', 'cyclone', 'tsunami', 'landslide', 'industrial', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
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
    country: String,
    postalCode: String
  },
  status: {
    type: String,
    enum: ['reported', 'verified', 'active', 'contained', 'resolved'],
    default: 'reported'
  },
  affectedRadius: {
    type: Number,  // in kilometers
    default: 1
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  images: [String],
  casualties: {
    dead: {
      type: Number,
      default: 0
    },
    injured: {
      type: Number,
      default: 0
    },
    missing: {
      type: Number,
      default: 0
    }
  },
  impactDetails: {
    infrastructureDamage: String,
    economicImpact: String,
    environmentalImpact: String
  },
  evacuationRequired: {
    type: Boolean,
    default: false
  },
  evacuationZones: [
    {
      name: String,
      coordinates: {
        type: [Number],
        index: '2dsphere'
      },
      radius: Number // in kilometers
    }
  ],
  safeZones: [
    {
      name: String,
      coordinates: {
        type: [Number],
        index: '2dsphere'
      },
      capacity: Number,
      currentOccupancy: {
        type: Number,
        default: 0
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

DisasterSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Disaster', DisasterSchema);
