const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const EmployeeController = require("../controllers/EmployeeController");

// Multer setup for company logo upload
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/companyLogos"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/update", authMiddleware, userController.update);
router.patch(
  "/update",
  authMiddleware,
  upload.single("companyLogo"),
  userController.update
);
router.get("/profile", authMiddleware, userController.getUserProfile);
router.get(
  "/activity/recent",
  authMiddleware,
  EmployeeController.getRecentActivity
);

module.exports = router;
