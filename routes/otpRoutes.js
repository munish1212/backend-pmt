const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");

router.post("/forgot-password", otpController.sendForgotPasswordOTP);
router.post("/verify-otp", otpController.verifyOTP);
router.post("/reset-password", otpController.resetPassword);

module.exports = router;