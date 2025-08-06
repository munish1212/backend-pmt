const Employee = require("../models/Employee");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User"); // Required for companyName
const Activity = require("../models/Activity");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

// API: Add new Employee
exports.addEmployee = async (req, res) => {
  if (
    req.user.role !== "owner" &&
    req.user.role !== "admin" &&
    req.user.role !== "manager"
  ) {
    return res
      .status(403)
      .json({ message: "Only owners, admins, and managers can add employees" });
  }

  const { name, email, designation, role, location, phoneNo, profileLogo } =
    req.body;

  if (!name || !email || !phoneNo) {
    return res
      .status(400)
      .json({ message: "Name, email, and phoneNo are required" });
  }

  try {
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res
        .status(400)
        .json({ message: "Email already exists for an employee" });
    }

    const lastEmployee = await Employee.findOne({
      teamMemberId: { $regex: /^WS-\d+$/ },
    })
      .sort({ teamMemberId: -1 })
      .collation({ locale: "en", numericOrdering: true });

    let newIdNumber = 1;
    if (lastEmployee && lastEmployee.teamMemberId) {
      const lastNumber = parseInt(lastEmployee.teamMemberId.split("-")[1]);
      newIdNumber = lastNumber + 1;
    }
    const teamMemberId = `WS-${newIdNumber.toString().padStart(3, "0")}`;

    const autoPassword = crypto.randomBytes(6).toString("hex");
    const hashedPassword = await bcrypt.hash(autoPassword, 10);
    const passwordExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const owner = await User.findById(req.user._id);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const newEmployee = new Employee({
      name,
      email,
      phoneNo,
      teamMemberId,
      designation,
      role,
      profileLogo,
      location,
      password: hashedPassword,
      passwordExpiresAt,
      addedBy: req.user._id,
      companyName: owner.companyName, // ✅ fetch from owner who added
    });

    await newEmployee.save();
    await Activity.create({
      type: "Employee",
      action: "add",
      name: newEmployee.name,
      description: `Added new employee ${newEmployee.name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    await sendEmail(
      email,
      "Welcome to the Team",
      `Hi ${name},

You've been added as an employee in ${owner.companyName}.

Login Email: ${email}
Password: ${autoPassword}

To set your password and activate your account, please log in here (valid for 5 minutes):
http://localhost:5173/emp-login

Note: This is an auto-generated password and it will expire in 5 minutes. If you do not set your password in time, your account will be deleted automatically.`
    );

    res
      .status(201)
      .json({ message: "Employee added successfully", employee: newEmployee });
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// API: First Login - Password Update
exports.employeeFirstLogin = async (req, res) => {
  const { email, oldPassword, newPassword, confirmPassword } = req.body;

  if (!email || !oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const employee = await Employee.findOne({ email });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  if (employee.passwordExpiresAt && new Date() > employee.passwordExpiresAt) {
    return res.status(403).json({
      message:
        "Your temporary password has expired. Please contact the administrator for a new one.",
    });
  }

  if (!employee.mustChangePassword)
    return res
      .status(400)
      .json({ message: "Password already updated, use login instead" });

  const isMatch = await bcrypt.compare(oldPassword, employee.password);
  if (!isMatch)
    return res.status(400).json({ message: "Old password is incorrect" });

  if (newPassword !== confirmPassword)
    return res.status(400).json({ message: "New passwords do not match" });

  if (newPassword.length < 6)
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });

  employee.password = await bcrypt.hash(newPassword, 10);
  employee.passwordExpiresAt = null;
  employee.mustChangePassword = false;

  await employee.save();

  res
    .status(200)
    .json({ message: "Password updated successfully. Please login." });
};

// API: Employee Login
exports.login = async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  if (confirmPassword !== undefined) {
    return res
      .status(400)
      .json({ message: "Do not include confirmPassword during login" });
  }

  try {
    const employee = await Employee.findOne({ email });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (employee.passwordExpiresAt && new Date() > employee.passwordExpiresAt) {
      return res.status(403).json({
        message:
          "Temporary password has expired. Please contact your administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    if (employee.mustChangePassword) {
      return res
        .status(400)
        .json({ message: "Please update your password before logging in" });
    }

    const token = jwt.sign(
      { id: employee._id, role: employee.role },
      "secret123",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      employee: {
        id: employee._id,
        teamMemberId: employee.teamMemberId,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Edit employee using teamMemberId
exports.editEmployee = async (req, res) => {
  const { teamMemberId } = req.params;
  const { name, email, designation, role, location, phoneNo, profileLogo } =
    req.body;

  if (!teamMemberId) {
    return res.status(400).json({ message: "teamMemberId is required" });
  }

  try {
    const userCompany = req.user.companyName;
    const employee = await Employee.findOne({
      teamMemberId,
      companyName: userCompany,
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (
      req.user.role !== "owner" &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      return res.status(403).json({ message: "Unauthorized to edit employee" });
    }

    if (name) employee.name = name;
    if (email) employee.email = email;
    if (designation !== undefined) employee.designation = designation;
    if (role) employee.role = role;
    if (location) employee.location = location;
    if (phoneNo) employee.phoneNo = phoneNo;
    if (profileLogo) employee.profileLogo = profileLogo;

    await employee.save();
    await Activity.create({
      type: "Employee",
      action: "edit",
      name: employee.name,
      description: `Edited employee ${employee.name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res
      .status(200)
      .json({ message: "Employee updated successfully", employee });
  } catch (error) {
    console.error("❌ Error updating employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete employee by teamMemberId
exports.deleteEmployee = async (req, res) => {
  const { teamMemberId } = req.params;
  if (!teamMemberId) {
    return res.status(400).json({ message: "teamMemberId is required" });
  }
  try {
    const userCompany = req.user.companyName;
    const employee = await Employee.findOne({
      teamMemberId,
      companyName: userCompany,
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await Employee.deleteOne({ teamMemberId, companyName: userCompany });
    await Activity.create({
      type: "Employee",
      action: "delete",
      name: employee.name,
      description: `Deleted employee ${employee.name}`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const employees = await Employee.find({ companyName: userCompany }).select(
      "-password"
    );
    res.status(200).json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "teamLead"
exports.getAllTeamLeads = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const teamLeads = await Employee.find({
      role: "teamLead",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(teamLeads);
  } catch (error) {
    console.error("Error fetching team leads:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "admin"
exports.getAllAdmins = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const admins = await Employee.find({
      role: "admin",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "manager"
exports.getAllManagers = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const managers = await Employee.find({
      role: "manager",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(managers);
  } catch (error) {
    console.error("Error fetching managers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all employees with role: "teamMember"
exports.getAllTeamMembers = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const teamMembers = await Employee.find({
      role: "teamMember",
      companyName: userCompany,
    }).select("-password");
    res.status(200).json(teamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    console.log("getRecentActivity called");
    console.log("User:", req.user);
    const userCompany = req.user.companyName;
    console.log("User company:", userCompany);

    const activities = await require("../models/Activity")
      .find({ companyName: userCompany })
      .sort({ timestamp: -1 })
      .limit(20);

    console.log("Found activities:", activities.length);
    res.status(200).json({ activities });
  } catch (error) {
    console.error("getRecentActivity error:", error);
    res.status(500).json({ message: "Failed to fetch activity", error });
  }
};

// Get all available roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = [
      { value: "admin", label: "Admin" },
      { value: "manager", label: "Manager" },
      { value: "teamLead", label: "Team Lead" },
      { value: "teamMember", label: "Team Member" },
    ];

    res.status(200).json({
      success: true,
      roles: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
