const mongoose = require("mongoose");
const User = require("./models/User");
const Employee = require("./models/Employee");
const Project = require("./models/Project");
const Task = require("./models/Task");
const Team = require("./models/Team");
const Activity = require("./models/Activity");

require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("MongoDB Connection error", err));

const migrateData = async () => {
  try {
    console.log("Starting migration...");

    // Get all users to map their company names
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log("No users found. Migration completed.");
      process.exit(0);
    }

    // Update Projects - assign companyName based on the user who created them
    const projects = await Project.find({ companyName: { $exists: false } });
    console.log(`Found ${projects.length} projects without companyName`);

    for (const project of projects) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        project.companyName = users[0].companyName;
        await project.save();
        console.log(
          `Updated project ${project.project_id} with companyName: ${users[0].companyName}`
        );
      }
    }

    // Update Tasks - assign companyName based on the user who created them
    const tasks = await Task.find({ companyName: { $exists: false } });
    console.log(`Found ${tasks.length} tasks without companyName`);

    for (const task of tasks) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        task.companyName = users[0].companyName;

        // Fix invalid status values
        if (task.status === "in progress") {
          task.status = "in-progress";
        }

        await task.save();
        console.log(
          `Updated task ${task.task_id} with companyName: ${users[0].companyName}`
        );
      }
    }

    // Update Teams - assign companyName based on the user who created them
    const teams = await Team.find({ companyName: { $exists: false } });
    console.log(`Found ${teams.length} teams without companyName`);

    for (const team of teams) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        team.companyName = users[0].companyName;
        await team.save();
        console.log(
          `Updated team ${team.teamName} with companyName: ${users[0].companyName}`
        );
      }
    }

    // Update Activities - assign companyName based on the user who created them
    const activities = await Activity.find({ companyName: { $exists: false } });
    console.log(`Found ${activities.length} activities without companyName`);

    for (const activity of activities) {
      // For now, assign to the first user's company (you may need to adjust this logic)
      if (users.length > 0) {
        activity.companyName = users[0].companyName;
        await activity.save();
        console.log(
          `Updated activity ${activity._id} with companyName: ${users[0].companyName}`
        );
      }
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

const migrateEmployeeRoles = async () => {
  try {
    console.log("Starting employee role migration...");

    // Find all employees with "employee" role
    const employeesToUpdate = await Employee.find({ role: "employee" });
    console.log(
      `Found ${employeesToUpdate.length} employees with "employee" role`
    );

    if (employeesToUpdate.length > 0) {
      // Update all employees with "employee" role to "teamMember"
      const result = await Employee.updateMany(
        { role: "employee" },
        { $set: { role: "teamMember" } }
      );

      console.log(
        `Successfully updated ${result.modifiedCount} employees from "employee" to "teamMember" role`
      );
    } else {
      console.log("No employees found with 'employee' role");
    }

    console.log("Employee role migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the migration
migrateEmployeeRoles();
