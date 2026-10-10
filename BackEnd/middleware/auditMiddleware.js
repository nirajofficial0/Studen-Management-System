const logActivity = (user, action, module, description, changes = null) => {
  const AuditLog = require('../models/AuditLog');

  const auditEntry = new AuditLog({
    user: user._id,
    action,
    module,
    description,
    changes,
    ipAddress: user.ipAddress,
    userAgent: user.userAgent
  });

  auditEntry.save().catch(err => console.error('Audit log error:', err));
};

const auditMiddleware = (req, res, next) => {
  // Capture user info
  req.user = req.user || {};
  req.user.ipAddress = req.ip;
  req.user.userAgent = req.get('user-agent');

  next();
};

module.exports = {
  logActivity,
  auditMiddleware
};
