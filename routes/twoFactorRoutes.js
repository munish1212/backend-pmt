const express = require("express");
const router = express.Router();
const twoFactorController = require("../controllers/twoFactorController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes (no auth required)
router.post("/verify", twoFactorController.verifyTwoFactorToken);
router.post("/validate-device", twoFactorController.validateDeviceToken);

// Protected routes (auth required)
router.use(authMiddleware);

// 2FA setup and management
router.post("/setup", twoFactorController.generateTwoFactorSetup);
router.post("/enable", twoFactorController.enableTwoFactor);
router.post("/disable", twoFactorController.disableTwoFactor);
router.get("/backup-codes", twoFactorController.getBackupCodes);
router.post(
  "/regenerate-backup-codes",
  twoFactorController.regenerateBackupCodes
);
router.get("/trusted-devices", twoFactorController.getTrustedDevices);
router.delete(
  "/trusted-devices/:deviceId",
  twoFactorController.removeTrustedDevice
);

module.exports = router;
