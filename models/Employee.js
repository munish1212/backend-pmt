const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  teamMemberId: { type: String, required: true, unique: true },
  designation: { type: String }, // ✅ renamed from lead-member
  phoneNo: { type: String, required: true }, // ✅ already present
  companyName: { type: String, required: true }, // ✅ new field
  profileLogo: { type: String }, // ✅ new field

  mustChangePassword: { type: Boolean, default: true },
  passwordExpiresAt: { type: Date, default: () => Date.now() + 5 * 60 * 1000 },

  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: { type: String, default: "teamMember" }, // teamMember, teamLead, admin, manager
  token: { type: String },
  location: { type: String },
  resetOTP: { type: String },
  resetOTPExpiry: { type: Date },
});

module.exports = mongoose.model("Employee", employeeSchema);
