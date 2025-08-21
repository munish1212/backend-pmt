require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
const userRoutes = require("./routes/userRoutes");
const teamRoutes = require("./routes/teamRoutes");
const employeeRoutes = require("./routes/employeeRoutes"); // updated
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes"); // task routes
const otpRoutes = require("./routes/otpRoutes");
const path = require("path");
const cors = require("cors");
const cron = require("node-cron");
const { Project } = require("./models/Project");
const Activity = require("./models/Activity");
const {
  deleteMultipleImagesFromCloudinary,
} = require("./utils/cloudinaryUpload");

app.use(
  cors({
    origin: [
      "https://project-flow.digiwbs.com",
      "http://localhost:8000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully "))
  .catch((err) => console.log("MongoDb Connection error", err));

app.use("/api", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/employees", employeeRoutes); // updated
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes); // task routes
app.use("/api/otp", otpRoutes);

// Also serve the same routes at /backend/api for frontend compatibility
app.use("/backend/api", userRoutes);
app.use("/backend/api/teams", teamRoutes);
app.use("/backend/api/employees", employeeRoutes);
app.use("/backend/api/projects", projectRoutes);
app.use("/backend/api/tasks", taskRoutes);
app.use("/backend/api/otp", otpRoutes);

// Auto-permanent delete job: runs every day at 2am
cron.schedule("0 2 * * *", async () => {
  console.log("[CRON] Running auto-permanent delete for projects...");
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const projectsToDelete = await Project.find({
    project_status: "deleted",
    deletedAt: { $lte: fiveDaysAgo },
  });
  console.log(`[CRON] Found ${projectsToDelete.length} projects to delete.`);
  for (const project of projectsToDelete) {
    try {
      // Collect all image URLs from project phases and subtasks
      const imageUrls = [];
      if (project.phases && Array.isArray(project.phases)) {
        project.phases.forEach((phase) => {
          if (phase.subtasks && Array.isArray(phase.subtasks)) {
            phase.subtasks.forEach((subtask) => {
              if (subtask.images && Array.isArray(subtask.images)) {
                imageUrls.push(...subtask.images);
              }
            });
          }
        });
      }
      if (imageUrls.length > 0) {
        await deleteMultipleImagesFromCloudinary(imageUrls);
      }
      await Project.findByIdAndDelete(project._id);
      await Activity.create({
        type: "Project",
        action: "permanently_delete",
        name: project.project_name,
        description: `Auto-permanently deleted project ${project.project_name} and ${imageUrls.length} associated images`,
        performedBy: "system-cron",
        companyName: project.companyName,
      });
      console.log(
        `[CRON] Permanently deleted project: ${project.project_name}`
      );
    } catch (err) {
      console.error(
        "[CRON] Error auto-deleting project:",
        project.project_id,
        err
      );
    }
  }
});

// Simple test route for debugging
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

// Serve frontend files
app.use(express.static(path.join(__dirname, "../client-side/dist")));

// Handle React routing - serve index.html for all non-API routes
app.get(/^\/(?!api|backend\/api).*/, (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith("/api") || req.path.startsWith("/backend/api")) {
    return res.status(404).json({ message: "API endpoint not found" });
  }

  // Serve the React app for all other routes
  res.sendFile(path.join(__dirname, "../client-side/dist/index.html"));
});

// Render deployment configuration
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Frontend will be served from /");
  console.log("Backend API available at /api");
  console.log("Environment:", process.env.NODE_ENV || "development");
});
