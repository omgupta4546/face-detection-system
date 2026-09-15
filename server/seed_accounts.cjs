/**
 * Seed script to create sample accounts for all roles
 * and seed welcome notifications for each user.
 * 
 * Usage: node seed_accounts.cjs
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User.js');
const Notification = require('./models/Notification.js');

const accounts = [
    {
        name: 'Prof. Rajesh Sharma',
        email: 'professor@smart.edu',
        password: 'Professor@123',
        role: 'professor',
    },
    {
        name: 'Admin Priya Verma',
        email: 'admin@smart.edu',
        password: 'Admin@123',
        role: 'admin',
    },
    {
        name: 'Super Admin Arjun Mehta',
        email: 'superadmin@smart.edu',
        password: 'SuperAdmin@123',
        role: 'super_admin',
    },
];

const sampleNotifications = {
    professor: [
        { title: 'Welcome to Smart Classroom!', message: 'Your professor account is set up. Start by creating a class from your dashboard.', type: 'update' },
        { title: 'New Feature: AI Attendance', message: 'You can now use live camera face recognition to take attendance. Try it out in the Attendance page!', type: 'update' },
        { title: 'Tip: Class Reports', message: 'View detailed attendance analytics and student performance from your Reports section.', type: 'class' },
    ],
    admin: [
        { title: 'Welcome, Admin!', message: 'You have admin access. You can manage users, monitor classes, and view platform analytics.', type: 'update' },
        { title: 'System Status: All Green', message: 'Platform health check passed. Database and all services are operational.', type: 'update' },
        { title: 'User Activity Alert', message: '3 new users registered this week. Review them in the User Management panel.', type: 'class' },
    ],
    super_admin: [
        { title: 'Welcome, Super Admin!', message: 'You have full platform-wide control. Manage institutions, users, and system health from your dashboard.', type: 'update' },
        { title: 'Institution Setup Required', message: 'Consider creating departments and linking them to classes for better organization.', type: 'class' },
        { title: 'Platform Analytics', message: 'Monthly report: 15 active classes, 200+ attendance sessions recorded. View full analytics in your dashboard.', type: 'update' },
        { title: 'Security Notice', message: 'All authentication tokens are encrypted. Recommend enabling 2FA for admin accounts in future updates.', type: 'update' },
    ],
};

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        for (const account of accounts) {
            // Check if already exists
            let user = await User.findOne({ email: account.email });
            if (user) {
                console.log(`⏭️  ${account.role} account already exists: ${account.email}`);
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(account.password, salt);

                user = new User({
                    name: account.name,
                    email: account.email,
                    password: hashedPassword,
                    role: account.role,
                });
                await user.save();
                console.log(`✅ Created ${account.role}: ${account.email} (password: ${account.password})`);
            }

            // Seed notifications for this user
            const existingNotifs = await Notification.countDocuments({ recipient: user._id });
            if (existingNotifs === 0) {
                const notifs = sampleNotifications[account.role] || [];
                for (let i = 0; i < notifs.length; i++) {
                    const n = new Notification({
                        recipient: user._id,
                        title: notifs[i].title,
                        message: notifs[i].message,
                        type: notifs[i].type,
                        // Stagger creation times so they appear in order
                        createdAt: new Date(Date.now() - (notifs.length - i) * 60 * 60 * 1000),
                    });
                    await n.save();
                }
                console.log(`   📬 Seeded ${notifs.length} notifications for ${account.email}`);
            } else {
                console.log(`   📬 Notifications already exist for ${account.email}`);
            }
        }

        console.log('\n🎉 Seed complete!\n');
        console.log('='.repeat(50));
        console.log('SAMPLE ACCOUNTS');
        console.log('='.repeat(50));
        console.log('');
        console.log('Professor:');
        console.log('  Email:    professor@smart.edu');
        console.log('  Password: Professor@123');
        console.log('');
        console.log('Admin (College Admin):');
        console.log('  Email:    admin@smart.edu');
        console.log('  Password: Admin@123');
        console.log('');
        console.log('Super Admin:');
        console.log('  Email:    superadmin@smart.edu');
        console.log('  Password: SuperAdmin@123');
        console.log('');
        console.log('='.repeat(50));

    } catch (err) {
        console.error('Seed Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seed();
