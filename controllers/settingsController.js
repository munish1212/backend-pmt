const User = require("../models/User");
const Activity = require("../models/Activity");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const {
      emailNotifications,
      taskReminders,
      projectUpdates,
      teamMessages,
      weeklyReports,
      dailyDigest,
    } = req.body;

    const userId = req.user._id;

    // Update user's notification settings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        "settings.notifications": {
          emailNotifications,
          taskReminders,
          projectUpdates,
          teamMessages,
          weeklyReports,
          dailyDigest,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log activity
    await Activity.create({
      type: "Settings",
      action: "update",
      name: "Notification Settings",
      description: "Updated notification preferences",
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res.status(200).json({
      message: "Notification settings updated",
      settings: updatedUser.settings?.notifications,
    });
  } catch (err) {
    console.error("Error updating notification settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update appearance settings
exports.updateAppearanceSettings = async (req, res) => {
  try {
    const {
      theme,
      sidebarCollapsed,
      compactMode,
      showAvatars,
      showStatusIndicators,
    } = req.body;

    const userId = req.user._id;

    // Update user's appearance settings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        "settings.appearance": {
          theme,
          sidebarCollapsed,
          compactMode,
          showAvatars,
          showStatusIndicators,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log activity
    await Activity.create({
      type: "Settings",
      action: "update",
      name: "Appearance Settings",
      description: "Updated appearance preferences",
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res.status(200).json({
      message: "Appearance settings updated",
      settings: updatedUser.settings?.appearance,
    });
  } catch (err) {
    console.error("Error updating appearance settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update security settings
exports.updateSecuritySettings = async (req, res) => {
  try {
    const {
      twoFactorAuth,
      sessionTimeout,
      loginNotifications,
      passwordExpiry,
    } = req.body;

    const userId = req.user._id;

    // Update user's security settings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        "settings.security": {
          twoFactorAuth,
          sessionTimeout,
          loginNotifications,
          passwordExpiry,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log activity
    await Activity.create({
      type: "Settings",
      action: "update",
      name: "Security Settings",
      description: "Updated security preferences",
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res.status(200).json({
      message: "Security settings updated",
      settings: updatedUser.settings?.security,
    });
  } catch (err) {
    console.error("Error updating security settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update privacy settings
exports.updatePrivacySettings = async (req, res) => {
  try {
    const {
      profileVisibility,
      activityVisibility,
      showOnlineStatus,
      allowDirectMessages,
    } = req.body;

    const userId = req.user._id;

    // Update user's privacy settings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        "settings.privacy": {
          profileVisibility,
          activityVisibility,
          showOnlineStatus,
          allowDirectMessages,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log activity
    await Activity.create({
      type: "Settings",
      action: "update",
      name: "Privacy Settings",
      description: "Updated privacy preferences",
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res.status(200).json({
      message: "Privacy settings updated",
      settings: updatedUser.settings?.privacy,
    });
  } catch (err) {
    console.error("Error updating privacy settings:", err);
    res.status(500).json({ message: "Server error" });
  }
};
