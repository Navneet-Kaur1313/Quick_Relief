const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config/default');
const auth = require('../../middleware/auth');
const roleCheck = require('../../middleware/roleCheck');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');

// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('phone', 'Phone number is required').not().isEmpty(),
    check('role', 'Role is required').isIn(['admin', 'sub-admin', 'victim', 'authority'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, role, location, address, preferredNotification, agencyInfo } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      user = new User({
        name,
        email,
        password,
        phone,
        role,
        location,
        address,
        preferredNotification,
        agencyInfo
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Return JWT
      const payload = {
        user: {
          id: user.id,
          role: user.role
        }
      };

      jwt.sign(
        payload,
        config.jwtSecret,
        { expiresIn: config.jwtExpiration },
        (err, token) => {
          if (err) throw err;
          res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route    GET api/users
// @desc     Get all users
// @access   Private/Admin
router.get('/', [auth, roleCheck(['admin', 'sub-admin'])], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    GET api/users/:id
// @desc     Get user by ID
// @access   Private/Admin
router.get('/:id', [auth, roleCheck(['admin', 'sub-admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route    GET api/users/nearby/:disasterId
// @desc     Get users near a disaster location
// @access   Private/Admin/Authority
router.get('/nearby/:disasterId', [auth, roleCheck(['admin', 'sub-admin', 'authority'])], async (req, res) => {
  try {
    const disaster = await Disaster.findById(req.params.disasterId);
    
    if (!disaster) {
      return res.status(404).json({ msg: 'Disaster not found' });
    }
    
    const maxDistance = disaster.affectedRadius * 1000; // Convert km to meters
    
    const users = await User.find({
      location: {
        $near: {
          $geometry: disaster.location,
          $maxDistance: maxDistance
        }
      }
    }).select('-password');
    
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    PUT api/users/:id
// @desc     Update user
// @access   Private
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is updating own profile or is an admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized to update this user' });
    }
    
    const { name, email, phone, location, address, preferredNotification, agencyInfo } = req.body;
    
    // Build user object
    const userFields = {};
    if (name) userFields.name = name;
    if (email) userFields.email = email;
    if (phone) userFields.phone = phone;
    if (location) userFields.location = location;
    if (address) userFields.address = address;
    if (preferredNotification) userFields.preferredNotification = preferredNotification;
    if (agencyInfo) userFields.agencyInfo = agencyInfo;
    userFields.updatedAt = Date.now();
    
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route    DELETE api/users/:id
// @desc     Delete user
// @access   Private/Admin
router.delete('/:id', [auth, roleCheck(['admin'])], async (req, res) => {
  try {
    await User.findByIdAndRemove(req.params.id);
    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
