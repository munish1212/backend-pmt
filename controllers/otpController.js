const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Employee = require("../models/Employee");
const sendEmail = require("../utils/sendEmail");

// Send 6-digit OTP
exports.sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    const employee = await Employee.findOne({ email });
    const account = user || employee;

    if (!account) return res.status(404).json({ message: "Account not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    account.resetOTP = otp;
    account.resetOTPExpiry = expiry;
    await account.save();

    await sendEmail(
      email,
      "🔐 Password Reset OTP - ProjectFlow",
      `Your OTP to reset your ProjectFlow password is: ${otp}\nThis OTP is valid for 10 minutes.`
    );

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Required fields missing" });

    const user = await User.findOne({ email });
    const employee = await Employee.findOne({ email });
    const account = user || employee;

    if (!account) return res.status(404).json({ message: "Account not found" });

    if (
      account.resetOTP !== otp ||
      !account.resetOTPExpiry ||
      account.resetOTPExpiry < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    account.resetOTP = null;
    account.resetOTPExpiry = null;
    await account.save();

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: "Required fields missing" });

    const user = await User.findOne({ email });
    const employee = await Employee.findOne({ email });
    const account = user || employee;

    if (!account) return res.status(404).json({ message: "Account not found" });

    const hashed = await bcrypt.hash(newPassword, 10);
    account.password = hashed;
    await account.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};