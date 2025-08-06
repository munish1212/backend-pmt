const Employee = require("../models/Employee");

module.exports = {
    isAuthorizedToAssign: (req, res, next) => {
        const { role } = req.user;
        if (['owner', 'Admin', 'manager', 'team_lead'].includes(role)) return next();
        return res.status(403).json({ message: 'Access denied for assigning tasks.' });
    },

    isSelfAssignment: (req, res, next) => {
        const { teamMemberId } = req.user;
        if (req.body.assignedTo === teamMemberId) {
            return res.status(400).json({ message: 'You cannot assign task to yourself.' });
        }
        next();
    }
};
