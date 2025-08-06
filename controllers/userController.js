const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const Employee = require("../models/Employee");

// APIs for user(company/owner) - registration, login, update
exports.register = async (req, res) => {
  try {
    const {
      companyName,
      companyDomain,
      companyID,
      companyAddress,
      founded_year,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    } = req.body;

    if (
      !companyName ||
      !companyDomain ||
      !companyID ||
      !companyAddress ||
      !founded_year ||
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingCompany = await User.findOne({ companyName });
    if (existingCompany) {
      return res.status(400).json({ message: "Company already registered" });
    }

    const existingDomain = await User.findOne({ companyDomain });
    if (existingDomain) {
      return res
        .status(400)
        .json({ message: "Company Domain already registered" });
    }

    const existingID = await User.findOne({ companyID });
    if (existingID) {
      return res.status(400).json({ message: "Company ID already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Generate employeeID if not provided
    const employeeID = `EMP${Math.floor(Math.random() * 1e12)}`;
    const joinDate = new Date();
    const newUser = new User({
      companyName,
      companyDomain,
      companyID,
      companyAddress,
      founded_year,
      firstName,
      lastName,
      email,
      password: hashed,
      employeeID,
      joinDate,
      accountStatus: "non-active",
      emailVerified: true,
      lastLogin: joinDate,
      accountType: "Standard",
    });
    await newUser.save();

    await sendEmail(
  email,
  "🎉 Registration Successful - Welcome to ProjectFlow!",
  `Dear ${firstName+lastName},\n\nThank you for registering with ProjectFlow.\n\nWe’re excited to have you on board! Your account has been successfully created, and you are now registered as an Owner on our platform.\n\nYou can now log in to your dashboard and begin managing your team, tracking progress, and streamlining your operations.\n\n Login here: [http://localhost:5173/login]\n\nIf you need any assistance getting started, our support team is here to help.\n\nWelcome to a better way to manage your team.\n\nBest regards,\nProjectFlow Support\n[http://localhost:5173]`
);

    res.status(201).json({ message: "Registered as owner" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Try User login first
    const userWithPassword = await User.findOne({ email });
    if (userWithPassword) {
      const isMatch = await bcrypt.compare(password, userWithPassword.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Wrong password" });
      }

      // Activate account if it's first login
      if (userWithPassword.accountStatus === "non-active") {
        userWithPassword.accountStatus = "active";
      }

      let token = userWithPassword.token;
      let isTokenValid = false;
      if (token) {
        try {
          jwt.verify(token, "secret123");
          isTokenValid = true;
        } catch (err) {
          isTokenValid = false;
        }
      }
      if (!isTokenValid) {
        token = jwt.sign({ id: userWithPassword._id }, "secret123", {
          expiresIn: "7d",
        });
        userWithPassword.token = token;
      }

      userWithPassword.lastLogin = new Date();
      await userWithPassword.save();

      const { password: _, ...userDetails } = userWithPassword.toObject();
      return res.json({
        message: "Login successful",
        token,
        user: userDetails,
        type: "user",
      });
    }

    // Try Employee login
    const employee = await Employee.findOne({ email });
    if (employee) {
      const isMatch = await bcrypt.compare(password, employee.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Wrong password" });
      }

      let token = employee.token;
      let isTokenValid = false;
      if (token) {
        try {
          jwt.verify(token, "secret123");
          isTokenValid = true;
        } catch (err) {
          isTokenValid = false;
        }
      }
      if (!isTokenValid) {
        token = jwt.sign({ id: employee._id }, "secret123", {
          expiresIn: "7d",
        });
        employee.token = token;
      }

      employee.lastLogin = new Date();
      await employee.save();

      const { password: _, ...employeeDetails } = employee.toObject();
      return res.json({
        message: "Login successful",
        token,
        employee: employeeDetails,
        type: "employee",
      });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.update = async (req, res) => {
  try {
    // In update, allow updating new fields
    const {
      companyName,
      companyDomain,
      companyAddress,
      email,
      website,
      industry,
      department,
      accountType,
    } = req.body;

    // Handle companyLogo upload
    let companyLogo;
    if (req.file) {
      companyLogo = `/uploads/companyLogos/${req.file.filename}`;
    }

    const updateFields = {
      companyName,
      companyDomain,
      companyAddress,
      email,
      website,
      industry,
      department,
      accountType,
    };
    if (companyLogo) updateFields.companyLogo = companyLogo;

    const updated = await User.findByIdAndUpdate(req.user._id, updateFields, {
      new: true,
    }).select("-password");

    res.json({ message: "Updated", user: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// To get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // First check in User collection
    const user = await User.findById(userId).select("-password");
    if (user) {
      return res.json({ type: "user", user });
    }

    // Then check in Employee collection
    const employee = await Employee.findById(userId).select("-password");
    if (employee) {
      return res.json({ type: "employee", employee });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};