const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const { check, validationResult } = require('express-validator');
const sendEmail = require('../../utils/sendEmail');
const sendSMS = require('../../utils/sendSMS');

const Alert = require('../../models/Alert');
const Disaster = require('../../models/Disaster');
const User = require('../../models/User');

// @route    POST api/alerts
// @desc     Create an alert
// @access   Private/Admin/SubAdmin/Authority
router.post(
  '/',
  [
    auth,
    roleCheck(['admin', 'sub-admin', 'authority']),
    [
      check('title', 'Title is required').not().isEmpty(),
      check('message', 'Message is required').not().isEmpty(),
      check('type', 'Type is required').isIn(['evacuation', 'warning', 'information', 'emergency', 'update', 'all-clear']),
      check('severity', 'Severity is required').isIn(['low', 'medium', 'high', 'critical']),
      check('disaster', 'Disaster is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        title,
        message,
        type,
        severity,
        disaster,
        location,
        targetAudience,
        expiresAt,
        actions,
        sentVia,
        status
      } = req.body;

      // Verify disaster exists
      const disasterExists = await Disaster.findById(disaster);
      if (!disasterExists) {
        return res.status(404).json({ msg: 'Disaster not found' });
      }

      // Create new alert
      const newAlert = new Alert({
        title,
        message,
        type,
        severity,
        disaster,
        location: location || disasterExists.location,
        targetAudience: targetAudience || 'all',
        expiresAt,
        actions,
        status: status || 'draft',
        sentVia: sentVia || ['app-notification', 'website'],
        createdBy: req.user.id
      });

      const alert = await newAlert.save();

      // If status is 'sent', send notifications
      if (status === 'sent') {
        await sendAlertNotifications(alert, req.app.get('io'));
      }

      res.json(alert);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// Helper function to send alert notifications
async function sendAlertNotifications(alert, io) {
  try {
    // Find affected users based on location and target audience
    const maxDistance = alert.location.radius * 1000; // Convert km to meters
    
    let audienceQuery = {};
    if (alert.targetAudience !== 'all') {
      if (alert.targetAudience === 'victims') {
        audienceQuery.role = 'victim';
      } else if (alert.targetAudience === 'authorities') {
        audienceQuery.role = { $in: ['admin', 'sub-admin', 'authority'] };
      } else if (alert.targetAudience === 'rescue-teams') {
        audienceQuery.role = 'authority';
        audienceQuery['agencyInfo.agencyType'] = { $in: ['rescue', 'medical', 'fire', 'police'] };
      }
    }
    
    const affectedUsers = await User.find({
      location: {
        $near: {
          $geometry: alert.location,
          $maxDistance: maxDistance
        }
      },
      ...audienceQuery
    });
    
    let sent = 0;
    let delivered = 0;
    
    // Send notifications via selected channels
    for (const user of affectedUsers) {
      sent++;
      
      // Send app notification via socket
      io.to(`user_${user._id}`).emit('newAlert', { alert });
      
      // Send email if selected
      if (alert.sentVia.includes('email') && 
          (user.preferredNotification === 'email' || user.preferredNotification === 'both')) {
        await sendEmail(
          user.email,
          `ALERT: ${alert.title}`,
          alert.message,
          alert.actions
        );
      }
      
      // Send SMS if selected
      if (alert.sentVia.includes('sms') && 
          (user.preferredNotification === 'sms' || user.preferredNotification === 'both')) {
        await sendSMS(
          user.phone,
          `ALERT: ${alert.title} - ${alert.message}`
        );
      }
      
      delivered++;
    }
    
    // Update delivery stats
    await Alert.findByIdAndUpdate(alert._id, {
      $set: {
        'deliveryStats.sent': sent,
        'deliveryStats.delivered': delivered
      }
    });
    
    // Broadcast to all connected disaster room clients
    io.to(`disaster_${alert.disaster}`).emit('newAlert', { alert });
    
    return { sent, delivered };
  } catch (error) {
    console.error('Error sending alert notifications:', error);
    throw error;
  }
}

// @route    GET api/alerts
// @desc     Get all alerts
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // Filter by disaster if provided
    if (req.query.disaster) {
      query.disaster = req.query.disaster;
    }
    
    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    // Filter by severity if provided
    if (req.query.severity) {
      query.severity = req.query.severity;
    }
    
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .populate('disaster', 'title type severity')
      .populate('createdBy', 'name role');
      
    res.json(alerts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/alerts/:id
// @desc     Get alert by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('disaster', 'title type severity')
      .populate('createdBy', 'name role');

    if (!alert) {
      return res.status(404).json({ msg: 'Alert not found' });
    }

    res.json(alert);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Alert not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/alerts/:id
// @desc     Update alert
// @access   Private/Admin/SubAdmin/Authority
router.put('/:id', [auth, roleCheck(['admin', 'sub-admin', 'authority'])], async (req, res) => {
  try {
    let alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ msg: 'Alert not found' });
    }

    const {
      title,
      message,
      type,
      severity,
      location,
      targetAudience,
      expiresAt,
      actions,
      status,
      sentVia
    } = req.body;

    // Build alert object
    const alertFields = {};
    if (title) alertFields.title = title;
    if (message) alertFields.message = message;
    if (type) alertFields.type = type;
    if (severity) alertFields.severity = severity;
    if (location) alertFields.location = location;
    if (targetAudience) alertFields.targetAudience = targetAudience;
    if (expiresAt) alertFields.expiresAt = expiresAt;
    if (actions) alertFields.actions = actions;
    if (sentVia) alertFields.sentVia = sentVia;
    
    // If status is changing to 'sent', mark it for notification sending
    const shouldSendNotifications = status === 'sent' && alert.status !== 'sent';
    
    if (status) alertFields.status = status;
    alertFields.updatedAt = Date.now();

    alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { $set: alertFields },
      { new: true }
    ).populate('disaster', 'title type severity')
     .populate('createdBy', 'name role');

    // If status changed to 'sent', send notifications
    if (shouldSendNotifications) {
      await sendAlertNotifications(alert, req.app.get('io'));
    }

    res.json(alert);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/alerts/:id
// @desc     Delete an alert
// @access   Private/Admin/SubAdmin
router.delete('/:id', [auth, roleCheck(['admin', 'sub-admin'])], async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ msg: 'Alert not found' });
    }

    await Alert.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Alert removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
