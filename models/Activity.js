const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Employee", "Team", "Project", "Task"],
    required: true,
  },
  action: {
    type: String,
    enum: ["add", "edit", "delete", "permanently_delete"],
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String },
  timestamp: { type: Date, default: Date.now },
  performedBy: { type: String }, // user name or id
  companyName: { type: String, required: true }, // Add company isolation
});

module.exports = mongoose.model("Activity", activitySchema);
