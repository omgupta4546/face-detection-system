const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// Standard console logging is used; Render will automatically capture stdout/stderr.

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
    res.send('Attendance API Running');
});

// Import Routes
const authRoutes = require('./routes/auth.js');
const classRoutes = require('./routes/class.js');
const adminRoutes = require('./routes/admin.js');
const institutionRoutes = require('./routes/institution.js');

app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/users.js'));
app.use('/api/classes', classRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/notifications', require('./routes/notifications.js'));
app.use('/api/logs', require('./routes/logs.js'));

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Global error handler (Express 5 catches async errors automatically)
app.use((err, req, res, next) => {
    console.error('[ERROR]', req.method, req.originalUrl, err.message);
    console.error(err.stack);
    res.status(err.status || 500).json({ msg: err.message || 'Internal Server Error' });
});

module.exports = app;
