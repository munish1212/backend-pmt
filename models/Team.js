const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true },
  description: { type: String },
  teamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  createdAt: { type: Date, default: Date.now },
  companyName: { type: String, required: true }, // Add company isolation
});

module.exports = mongoose.model("Team", teamSchema);
