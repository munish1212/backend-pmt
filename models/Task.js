const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ["pending", "verification", "in-progress", "completed", "deleted"],
    default: "pending",
  },
  assignedTo: {
    type: String, // Now storing teamMemberId (e.g., WS-001)
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedByRole: {
    type: String,
    enum: ["owner", "admin", "manager", "team_lead"],
    required: true,
  },
  project: {
    type: String, // project_id from Project
    required: true,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    required: true,
  },
  dueDate: {
    type: String,
    required: true,
  },
  task_id: { type: String, unique: true },
  deletionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
  companyName: { type: String, required: true }, // Add company isolation
  comments: [
    {
      text: { type: String, required: true },
      author: { type: String, required: true },
      date: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Task", taskSchema);
