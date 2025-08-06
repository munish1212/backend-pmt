const User = require("../models/User");
const Employee = require("../models/Employee");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// Helper function to find user by ID (User or Employee)
const findUserById = async (userId) => {
  let user = await User.findById(userId);
  if (user) return { user, type: "User" };

  let employee = await Employee.findById(userId);
  if (employee) return { user: employee, type: "Employee" };

  return null;
};

// Helper function to find user by email (User or Employee)
const findUserByEmail = async (email) => {
  let user = await User.findOne({ email });
  if (user) return { user, type: "User" };

  let employee = await Employee.findOne({ email });
  if (employee) return { user: employee, type: "Employee" };

  return null;
};

// Generate 2FA setup
exports.generateTwoFactorSetup = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("Generating 2FA setup for user:", userId);

    const userResult = await findUserById(userId);

    if (!userResult) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    const { user, type } = userResult;
    console.log("Found user for 2FA setup:", {
      userId: user._id,
      type,
      email: user.email,
    });

    // Check if 2FA is already enabled
    const rootLevel2FA = user.twoFactorEnabled;
    const settingsLevel2FA = user.settings?.security?.twoFactorAuth;
    const is2FAEnabled = rootLevel2FA || settingsLevel2FA;

    if (is2FAEnabled) {
      console.log("2FA is already enabled for user:", user._id);
      return res.status(400).json({
        message: "Two-factor authentication is already enabled",
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${user.firstName || user.name} (${user.email})`,
      issuer: "Project Management Tool",
      length: 32,
    });

    console.log("Generated secret:", secret.base32.substring(0, 10) + "...");

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    console.log("Generated QR code URL");

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }

    console.log("Generated backup codes:", backupCodes.length);

    // Update user with secret and backup codes
    user.twoFactorSecret = secret.base32;
    user.backupCodes = backupCodes;
    await user.save();

    console.log("Saved 2FA setup to database for user:", user._id);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: backupCodes,
      message: "2FA setup generated successfully",
    });
  } catch (error) {
    console.error("Generate 2FA setup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Enable 2FA
exports.enableTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    console.log("Enabling 2FA for user:", userId, "with token:", token);

    const userResult = await findUserById(userId);

    if (!userResult) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    const { user } = userResult;
    console.log("Found user for 2FA enable:", {
      userId: user._id,
      hasSecret: !!user.twoFactorSecret,
    });

    if (!user.twoFactorSecret) {
      console.log("No 2FA secret found for user:", user._id);
      return res
        .status(400)
        .json({ message: "2FA not set up. Please generate setup first." });
    }

    // Verify token
    console.log(
      "Verifying token with secret:",
      user.twoFactorSecret.substring(0, 10) + "..."
    );
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 2, // Allow 2 time steps in case of slight time difference
    });

    console.log("Token verification result:", verified);

    if (!verified) {
      console.log("Token verification failed for user:", user._id);
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Enable 2FA - update both root level and settings level
    user.twoFactorEnabled = true;

    // Also update the settings.security.twoFactorAuth field
    if (!user.settings) user.settings = {};
    if (!user.settings.security) user.settings.security = {};
    user.settings.security.twoFactorAuth = true;

    await user.save();

    console.log("2FA enabled successfully for user:", user._id);
    res.json({ message: "Two-factor authentication enabled successfully" });
  } catch (error) {
    console.error("Enable 2FA error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Disable 2FA
exports.disableTwoFactor = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    const userResult = await findUserById(userId);

    if (!userResult) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user } = userResult;

    // Check both root level and settings level for 2FA status
    const rootLevel2FA = user.twoFactorEnabled;
    const settingsLevel2FA = user.settings?.security?.twoFactorAuth;
    const is2FAEnabled = rootLevel2FA || settingsLevel2FA;

    if (!is2FAEnabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Disable 2FA and clear secret - update both root level and settings level
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = [];
    user.trustedDevices = [];

    // Also update the settings.security.twoFactorAuth field
    if (!user.settings) user.settings = {};
    if (!user.settings.security) user.settings.security = {};
    user.settings.security.twoFactorAuth = false;

    await user.save();

    res.json({ message: "Two-factor authentication disabled successfully" });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify 2FA token during login
exports.verifyTwoFactorToken = async (req, res) => {
  try {
    const { email, token, rememberDevice, deviceName } = req.body;
    console.log("2FA Verification Request:", {
      email,
      token: token ? "provided" : "missing",
      rememberDevice,
      deviceName,
    });

    const userResult = await findUserByEmail(email);

    if (!userResult) {
      console.log("User not found for email:", email);
      return res.status(404).json({ message: "User not found" });
    }

    const { user, type } = userResult;

    // Check both root level and settings level for 2FA status
    const rootLevel2FA = user.twoFactorEnabled;
    const settingsLevel2FA = user.settings?.security?.twoFactorAuth;
    const is2FAEnabled = rootLevel2FA || settingsLevel2FA;

    console.log("Found user:", {
      userId: user._id,
      type,
      rootLevel2FA,
      settingsLevel2FA,
      is2FAEnabled,
      hasSecret: !!user.twoFactorSecret,
    });

    if (!is2FAEnabled) {
      console.log("2FA not enabled for user:", user._id);
      return res
        .status(400)
        .json({ message: "2FA is not enabled for this user" });
    }

    if (!user.twoFactorSecret) {
      console.log("No 2FA secret found for user:", user._id);
      return res
        .status(400)
        .json({ message: "2FA secret not found. Please set up 2FA again." });
    }

    // Check if it's a backup code
    const isBackupCode = user.backupCodes.includes(token);
    console.log("Token check:", {
      isBackupCode,
      tokenLength: token?.length,
      hasBackupCodes: user.backupCodes.length > 0,
    });

    if (!isBackupCode) {
      // Verify TOTP token
      console.log(
        "Verifying TOTP token with secret:",
        user.twoFactorSecret.substring(0, 10) + "..."
      );
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: token,
        window: 2,
      });

      console.log("TOTP verification result:", verified);

      if (!verified) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
    } else {
      // Remove used backup code
      console.log("Using backup code, removing from list");
      user.backupCodes = user.backupCodes.filter((code) => code !== token);
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      "secret123",
      { expiresIn: "24h" }
    );

    // Handle device remembering
    if (rememberDevice && deviceName) {
      const deviceId = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const trustedDevice = {
        deviceId,
        deviceName,
        lastUsed: new Date(),
        expiresAt,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
      };

      user.trustedDevices.push(trustedDevice);
      await user.save();

      // Generate device-specific token
      const deviceToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          deviceId,
          type: "device",
        },
        "secret123",
        { expiresIn: "7d" }
      );

      const userData =
        type === "User"
          ? {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              companyName: user.companyName,
            }
          : {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              companyName: user.companyName,
            };

      // Send login notification email to the owner (only for User type, not Employee)
      if (type === "User") {
        try {
          const loginTime = new Date().toLocaleString();
          const deviceInfo = req.headers["user-agent"] || "Unknown device";
          const ipAddress =
            req.ip || req.connection.remoteAddress || "Unknown IP";

          await sendEmail(
            user.email,
            "🔐 Login Notification - ProjectFlow",
            `Hello ${user.firstName} ${user.lastName},\n\nYou have successfully logged into your ProjectFlow account with 2FA verification.\n\n📅 Login Details:\n• Time: ${loginTime}\n• Device: ${deviceInfo}\n• IP Address: ${ipAddress}\n• Remembered Device: ${deviceName}\n\nIf this was not you, please contact support immediately.\n\nBest regards,\nProjectFlow Security Team`
          );
          console.log(`Login notification email sent to ${user.email}`);
        } catch (emailError) {
          console.error("Error sending login notification email:", emailError);
          // Don't fail the login if email fails
        }
      }

      console.log("2FA verification successful with device remembering");
      return res.json({
        message: "2FA verification successful",
        token: jwtToken,
        deviceToken,
        deviceId,
        [type.toLowerCase()]: userData,
      });
    }

    const userData =
      type === "User"
        ? {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            companyName: user.companyName,
          }
        : {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyName: user.companyName,
          };

    // Send login notification email to the owner (only for User type, not Employee)
    if (type === "User") {
      try {
        const loginTime = new Date().toLocaleString();
        const deviceInfo = req.headers["user-agent"] || "Unknown device";
        const ipAddress =
          req.ip || req.connection.remoteAddress || "Unknown IP";

        await sendEmail(
          user.email,
          "🔐 Login Notification - ProjectFlow",
          `Hello ${user.firstName} ${user.lastName},\n\nYou have successfully logged into your ProjectFlow account with 2FA verification.\n\n📅 Login Details:\n• Time: ${loginTime}\n• Device: ${deviceInfo}\n• IP Address: ${ipAddress}\n\nIf this was not you, please contact support immediately.\n\nBest regards,\nProjectFlow Security Team`
        );
        console.log(`Login notification email sent to ${user.email}`);
      } catch (emailError) {
        console.error("Error sending login notification email:", emailError);
        // Don't fail the login if email fails
      }
    }

    console.log("2FA verification successful");
    res.json({
      message: "2FA verification successful",
      token: jwtToken,
      [type.toLowerCase()]: userData,
    });
  } catch (error) {
    console.error("Verify 2FA token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Validate device token
exports.validateDeviceToken = async (req, res) => {
  try {
    const { email, deviceToken, deviceId } = req.body;
    console.log("Device token validation request:", { email, deviceId });

    const userResult = await findUserByEmail(email);
    if (!userResult) {
      console.log("User not found for device validation");
      return res.status(404).json({ message: "User not found" });
    }

    const { user, type } = userResult;
    console.log("Found user for device validation:", {
      userId: user._id,
      type,
      hasTrustedDevices: user.trustedDevices.length > 0,
    });

    // Find the trusted device
    const trustedDevice = user.trustedDevices.find(
      (device) => device.deviceId === deviceId
    );

    if (!trustedDevice) {
      console.log("Trusted device not found");
      return res.status(400).json({ message: "Device not trusted" });
    }

    // Check if device is expired
    const currentDate = new Date();
    if (trustedDevice.expiresAt < currentDate) {
      console.log("Trusted device expired");
      // Remove expired device
      user.trustedDevices = user.trustedDevices.filter(
        (device) => device.deviceId !== deviceId
      );
      await user.save();
      return res.status(400).json({ message: "Device token expired" });
    }

    // Verify device token
    try {
      const decoded = jwt.verify(deviceToken, "secret123");

      if (decoded.deviceId !== deviceId || decoded.id !== user._id.toString()) {
        console.log("Device token verification failed");
        return res.status(400).json({ message: "Invalid device token" });
      }

      // Update last used time
      trustedDevice.lastUsed = currentDate;
      await user.save();

      // Generate new JWT token for the session
      const jwtToken = jwt.sign(
        { id: user._id, email: user.email },
        "secret123",
        { expiresIn: "24h" }
      );

      const userData =
        type === "User"
          ? {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              companyName: user.companyName,
            }
          : {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              companyName: user.companyName,
            };

      // Send login notification email to the owner (only for User type, not Employee)
      if (type === "User") {
        try {
          const loginTime = new Date().toLocaleString();
          const deviceInfo = req.headers["user-agent"] || "Unknown device";
          const ipAddress =
            req.ip || req.connection.remoteAddress || "Unknown IP";

          await sendEmail(
            user.email,
            "🔐 Login Notification - ProjectFlow",
            `Hello ${user.firstName} ${user.lastName},\n\nYou have successfully logged into your ProjectFlow account using a remembered device.\n\n📅 Login Details:\n• Time: ${loginTime}\n• Device: ${deviceInfo}\n• IP Address: ${ipAddress}\n• Remembered Device: ${trustedDevice.deviceName}\n\nIf this was not you, please contact support immediately.\n\nBest regards,\nProjectFlow Security Team`
          );
          console.log(`Login notification email sent to ${user.email}`);
        } catch (emailError) {
          console.error("Error sending login notification email:", emailError);
          // Don't fail the login if email fails
        }
      }

      console.log("Device token validation successful");
      res.json({
        message: "Device token valid",
        token: jwtToken,
        [type.toLowerCase()]: userData,
        skipTwoFactor: true,
      });
    } catch (jwtError) {
      console.log("JWT verification failed:", jwtError.message);
      return res.status(400).json({ message: "Invalid device token" });
    }
  } catch (error) {
    console.error("Validate device token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get trusted devices
exports.getTrustedDevices = async (req, res) => {
  try {
    const userId = req.user._id;
    const userResult = await findUserById(userId);

    if (!userResult) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user } = userResult;

    // Filter out expired devices
    const currentDate = new Date();
    const activeDevices = user.trustedDevices.filter(
      (device) => device.expiresAt > currentDate
    );

    // Update user's trusted devices to remove expired ones
    if (activeDevices.length !== user.trustedDevices.length) {
      user.trustedDevices = activeDevices;
      await user.save();
    }

    res.json({ devices: activeDevices });
  } catch (error) {
    console.error("Get trusted devices error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove trusted device
exports.removeTrustedDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user._id;
    const userResult = await findUserById(userId);

    if (!userResult) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user } = userResult;

    user.trustedDevices = user.trustedDevices.filter(
      (device) => device.deviceId !== deviceId
    );
    await user.save();

    res.json({ message: "Device removed successfully" });
  } catch (error) {
    console.error("Remove trusted device error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get backup codes
exports.getBackupCodes = async (req, res) => {
  try {
    const userId = req.user._id;
    const userResult = await findUserById(userId);

    if (!userResult) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user } = userResult;

    res.json({ backupCodes: user.backupCodes });
  } catch (error) {
    console.error("Get backup codes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Regenerate backup codes
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const userId = req.user._id;
    const userResult = await findUserById(userId);

    if (!userResult) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user } = userResult;

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }

    user.backupCodes = backupCodes;
    await user.save();

    res.json({
      backupCodes: backupCodes,
      message: "Backup codes regenerated successfully",
    });
  } catch (error) {
    console.error("Regenerate backup codes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
