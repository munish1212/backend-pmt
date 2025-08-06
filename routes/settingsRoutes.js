const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const authMiddleware = require("../middleware/authMiddleware");

// All settings routes require authentication
router.use(authMiddleware);

// Notification settings
router.put("/notifications", settingsController.updateNotificationSettings);

// Appearance settings
router.put("/appearance", settingsController.updateAppearanceSettings);

// Security settings
router.put("/security", settingsController.updateSecuritySettings);

// Privacy settings
router.put("/privacy", settingsController.updatePrivacySettings);

module.exports = router;
