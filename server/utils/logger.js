const AuditLog = require('../models/AuditLog');

const logAction = async (action, user, target, details = {}) => {
    try {
        const log = new AuditLog({
            action,
            performedBy: user.id,
            institutionId: user.institutionId,
            target,
            details
        });
        await log.save();
        console.log(`[AUDIT] ${action} by user:${user.id} on ${target}`);
    } catch (err) {
        console.error("Failed to create audit log:", err);
    }
};

module.exports = logAction;
