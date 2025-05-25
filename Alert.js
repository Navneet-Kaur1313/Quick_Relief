const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['evacuation', 'warning', 'information', 'emergency', 'update', 'all-clear'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  disaster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Disaster',
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
    },
    radius: {  // Alert broadcast radius in km
      type: Number,
      default: 10
    }
  },
  targetAudience: {
    type: String,
    enum: ['all', 'victims', 'authorities', 'rescue-teams'],
    default: 'all'
  },
  expiresAt: {
    type: Date
  },
  actions: [{
    actionType: {
      type: String,
      enum: ['evacuate', 'shelter', 'prepare', 'avoid-area', 'seek-help', 'other']
    },
    instructions: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'expired', 'cancelled'],
    default: 'draft'
  },
  sentVia: [{
    type: String,
    enum: ['sms', 'email', 'app-notification', 'website']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryStats: {
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    read: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
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

AlertSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Alert', AlertSchema);
