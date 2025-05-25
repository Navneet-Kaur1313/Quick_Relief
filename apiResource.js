const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const { check, validationResult } = require('express-validator');

const Resource = require('../../models/Resource');
const User = require('../../models/User');

// @route    POST api/resources
// @desc     Create a resource
// @access   Private
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('type', 'Type is required').isIn(['medical', 'shelter', 'food', 'water', 'rescue', 'transportation', 'other']),
      check('category', 'Category is required').isIn(['human', 'material', 'facility']),
      check('quantity', 'Quantity is required').isNumeric()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name,
        type,
        category,
        quantity,
        unit,
        location,
        address,
        status,
        specialRequirements,
        expiryDate,
        contact,
        assignedToDisaster
      } = req.body;

      // Create new resource
      const newResource = new Resource({
        name,
        type,
        category,
        quantity,
        unit: unit || 'units',
        location,
        address,
        status: status || 'available',
        owners: [req.user.id],
        specialRequirements,
        expiryDate,
        contact,
        assignedToDisaster
      });

      const resource = await newResource.save();

      // If assigned to a disaster, emit socket event
      if (assignedToDisaster) {
        req.app.get('io').to(`disaster_${assignedToDisaster}`).emit('resourceAssigned', { resource });
      }

      res.json(resource);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    GET api/resources
// @desc     Get all resources
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by disaster if provided
    if (req.query.disaster) {
      query.assignedToDisaster = req.query.disaster;
    }
    
    const resources = await Resource.find(query)
      .sort({ createdAt: -1 })
      .populate('owners', 'name email')
      .populate('assignedToDisaster', 'title type severity');
      
    res.json(resources);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/resources/:id
// @desc     Get resource by ID
// @access   Private
router.get('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('owners', 'name email')
      .populate('assignedToDisaster', 'title type severity');

    if (!resource) {
      return res.status(404).json({ msg: 'Resource not found' });
    }

    res.json(resource);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Resource not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    GET api/resources/nearby
// @desc     Get resources near a location
// @access   Private
router.get('/nearby', auth, async (req, res) => {
  try {
    const { longitude, latitude, radius = 10, type } = req.query; // radius in km
    
    if (!longitude || !latitude) {
      return res.status(400).json({ msg: 'Longitude and latitude are required' });
    }
    
    let query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert to meters
        }
      },
      status: 'available'
    };
    
    if (type) {
      query.type = type;
    }
    
    const resources = await Resource.find(query)
      .sort({ createdAt: -1 })
      .populate('owners', 'name email');
    
    res.json(resources);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/resources/:id
// @desc     Update resource
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ msg: 'Resource not found' });
    }

    // Check ownership or admin role
    const isOwner = resource.owners.some(owner => owner.toString() === req.user.id);
    const user = await User.findById(req.user.id);
    
    if (!isOwner && !['admin', 'sub-admin', 'authority'].includes(user.role)) {
      return res.status(403).json({ msg: 'Not authorized to update this resource' });
    }

    const {
      name,
      type,
      category,
      quantity,
      unit,
      location,
      address,
      status,
      specialRequirements,
      expiryDate,
      contact,
      assignedToDisaster,
      tracking
    } = req.body;

    // Build resource object
    const resourceFields = {};
    if (name) resourceFields.name = name;
    if (type) resourceFields.type = type;
    if (category) resourceFields.category = category;
    if (quantity) resourceFields.quantity = quantity;
    if (unit) resourceFields.unit = unit;
    if (location) resourceFields.location = location;
    if (address) resourceFields.address = address;
    if (status) resourceFields.status = status;
    if (specialRequirements) resourceFields.specialRequirements = specialRequirements;
    if (expiryDate) resourceFields.expiryDate = expiryDate;
    if (contact) resourceFields.contact = contact;
    if (assignedToDisaster) resourceFields.assignedToDisaster = assignedToDisaster;
    if (tracking) {
      resourceFields.tracking = tracking;
      resourceFields.tracking.lastUpdated = Date.now();
    }
    
    resourceFields.updatedAt = Date.now();

    const updatedResource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $set: resourceFields },
      { new: true }
    ).populate('owners', 'name email')
     .populate('assignedToDisaster', 'title type severity');

    // If resource location is updated and tracking is active, emit socket event
    if (tracking && tracking.active && tracking.currentLocation) {
      req.app.get('io').emit('resourceMoved', { resource: updatedResource });
    }

    res.json(updatedResource);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/resources/:id
// @desc     Delete a resource
// @access   Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ msg: 'Resource not found' });
    }

    // Check ownership or admin role
    const isOwner = resource.owners.some(owner => owner.toString() === req.user.id);
    const user = await User.findById(req.user.id);
    
    if (!isOwner && user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized to delete this resource' });
    }

    await Resource.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Resource removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
