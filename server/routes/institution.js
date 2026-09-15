const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Middleware: Check for Super Admin
const isSuperAdmin = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.user.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Super Admin access required' });
        }
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token invalid' });
    }
};

// @route   POST /api/institutions/create
// @desc    Create a new Institution
// @access  Super Admin
router.post('/create', isSuperAdmin, async (req, res) => {
    const { name, code, address } = req.body;
    try {
        let institution = await Institution.findOne({ code });
        if (institution) return res.status(400).json({ msg: 'Institution code already exists' });

        institution = new Institution({ name, code, address });
        await institution.save();
        res.json(institution);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/institutions/add-admin
// @desc    Create/Assign a College Admin
// @access  Super Admin
router.post('/add-admin', isSuperAdmin, async (req, res) => {
    const { name, email, password, institutionId } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'college_admin',
            institutionId
        });

        await user.save();

        // Link admin to institution
        await Institution.findByIdAndUpdate(institutionId, { adminId: user._id });

        res.json({ msg: 'College Admin created', user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/institutions/all
// @desc    Get all institutions
// @access  Public (for registration dropdown) or Super Admin
router.get('/all', async (req, res) => {
    try {
        const institutions = await Institution.find().select('name code _id');
        res.json(institutions);
    } catch (err) {
        console.error('Institution fetch error:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
