const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const employeeAuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    try {
        const decoded = jwt.verify(token, 'secret123'); 
        const employee = await Employee.findById(decoded.id).select('-password');

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        req.employee = employee;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = employeeAuthMiddleware;