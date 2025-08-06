const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Team = require("../models/Team");
const Activity = require("../models/Activity");
const { Project } = require("../models/Project");
const User = require("../models/User");

const getPerformer = (user) =>
  user?.firstName
    ? user.firstName + (user.lastName ? " " + user.lastName : "")
    : user?.name || user?.email || "Unknown";

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, project, priority, dueDate } =
      req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Title is required." });
    }
    if (!project || project.trim() === "") {
      return res.status(400).json({ message: "Project is required." });
    }
    if (
      !priority ||
      !["low", "medium", "high", "critical"].includes(priority)
    ) {
      return res.status(400).json({
        message: "Priority must be one of: low, medium, high, critical.",
      });
    }
    if (!dueDate || dueDate.trim() === "") {
      return res.status(400).json({ message: "Due date is required." });
    }

    const userCompany = req.user.companyName;

    // Validate project existence
    const projectDoc = await Project.findOne({
      project_id: project,
      companyName: userCompany,
    });
    if (!projectDoc) {
      return res
        .status(404)
        .json({ message: "Project with this project_id not found." });
    }

    // Check if the provided teamMemberId exists
    const employee = await Employee.findOne({
      teamMemberId: assignedTo,
      companyName: userCompany,
    });
    if (!employee) {
      return res
        .status(404)
        .json({ message: "Employee with this teamMemberId not found." });
    }

    // Auto-generate task_id like COMP-TSK-001
    const companyInitials = userCompany
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();

    const lastCompanyTask = await Task.find({ companyName: userCompany })
      .sort({ createdAt: -1 })
      .limit(1);

    let taskNumber = 1;
    if (
      lastCompanyTask.length &&
      lastCompanyTask[0].task_id &&
      lastCompanyTask[0].task_id.startsWith(`${companyInitials}-TSK-`)
    ) {
      const lastIdNum = parseInt(lastCompanyTask[0].task_id.split("-TSK-")[1]);
      if (!isNaN(lastIdNum)) {
        taskNumber = lastIdNum + 1;
      }
    }

    const newTaskId = `${companyInitials}-TSK-${taskNumber
      .toString()
      .padStart(3, "0")}`;

    const task = new Task({
      task_id: newTaskId,
      title: title.trim(),
      description: description?.trim(),
      assignedTo: assignedTo.trim(),
      assignedBy: req.user._id,
      assignedByRole: req.user.role.toLowerCase(),
      project,
      priority,
      dueDate,
      companyName: userCompany,
    });

    await task.save();

    await Activity.create({
      type: "Task",
      action: "add",
      name: task.title,
      description: `Created task ${task.title}`,
      performedBy: getPerformer(req.user),
      companyName: userCompany,
    });

    // Fetch assigner's name for response
    const assigner = await User.findById(req.user._id);
    const assignedByName = assigner
      ? `${assigner.firstName} ${assigner.lastName}`
      : "Unknown";

    // Return task with assignedBy as name
    const taskObj = task.toObject();
    taskObj.assignedBy = assignedByName;

    res
      .status(201)
      .json({ message: "Task created successfully.", task: taskObj });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating task.", error });
  }
};

exports.getTasksForSelf = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    const tasks = await Task.find({
      assignedTo: req.user.teamMemberId,
      companyName: userCompany,
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks.", error });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const { role, teamId } = req.user;

    const userCompany = req.user.companyName;
    let tasks;
    if (role === "TeamLead") {
      const team = await Team.findById(teamId);
      const memberIds = team.members.map((member) => member.teamMemberId);
      tasks = await Task.find({
        assignedTo: { $in: memberIds },
        companyName: userCompany,
      });
    } else {
      tasks = await Task.find({ companyName: userCompany });
    }

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all tasks.", error });
  }
};

exports.getTaskHistoryByMemberId = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    const userCompany = req.user.companyName;
    const tasks = await Task.find({
      assignedTo: teamMemberId,
      status: { $in: ["completed", "deleted", "Completed", "Deleted"] },
      companyName: userCompany,
    });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Error fetching task history.", error });
  }
};

exports.getOngoingTasks = async (req, res) => {
  try {
    const userCompany = req.user.companyName;
    let filter = {
      status: { $in: ["pending", "in-progress", "verification"] },
      companyName: userCompany,
    };
    if (req.params.teamMemberId) {
      filter.assignedTo = req.params.teamMemberId;
    }
    const tasks = await Task.find(filter);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Error fetching ongoing tasks.", error });
  }
};

exports.updateTasksByTeamMemberId = async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    const {
      title,
      description,
      status,
      newAssignedTo,
      priority,
      dueDate,
      project,
      deletionReason,
      completedAt,
      comment,
    } = req.body;

    const userCompany = req.user.companyName;
    const tasks = await Task.find({
      assignedTo: teamMemberId,
      companyName: userCompany,
    });
    if (tasks.length === 0) {
      return res
        .status(404)
        .json({ message: "No tasks found for the given teamMemberId." });
    }

    // Check permissions
    const isAuthorized = ["owner", "admin", "manager"].includes(
      req.user.role.toLowerCase()
    );
    if (!isAuthorized) {
      const unauthorizedTask = tasks.find(
        (task) => String(task.assignedBy) !== String(req.user._id)
      );
      if (unauthorizedTask) {
        return res
          .status(403)
          .json({ message: "Not authorized to update some tasks." });
      }
    }

    const updatePayload = {};

    // General fields update
    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (priority && ["low", "medium", "high", "critical"].includes(priority))
      updatePayload.priority = priority;
    if (dueDate) updatePayload.dueDate = dueDate;
    if (project) updatePayload.project = project;
    if (deletionReason) updatePayload.deletionReason = deletionReason;
    if (completedAt) updatePayload.completedAt = completedAt;

    // Handle reassignment
    if (newAssignedTo) {
      const Employee = require("../models/Employee");
      const newAssignee = await Employee.findOne({
        teamMemberId: newAssignedTo,
        companyName: userCompany,
      });
      if (!newAssignee) {
        return res
          .status(404)
          .json({ message: "New assigned member not found." });
      }
      updatePayload.assignedTo = newAssignedTo;
      updatePayload.status = "pending";
    }

    // Handle status updates
    if (status) {
      const validStatuses = [
        "pending",
        "verification",
        "in-progress",
        "completed",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }

      if (status === "completed") {
        const isTeamLead = req.user.role.toLowerCase() === "teamlead";
        const allInVerification = tasks.every(
          (task) => task.status === "verification"
        );
        if (!isTeamLead || !allInVerification) {
          return res.status(403).json({
            message:
              "Only a TeamLead can mark a task as completed after verification.",
          });
        }
        updatePayload.status = "completed";
      } else if (status === "verification") {
        updatePayload.status = "verification";
      } else {
        updatePayload.status = status;
      }
    }

    if (Object.keys(updatePayload).length === 0 && !comment) {
      return res
        .status(400)
        .json({ message: "No valid update fields provided." });
    }

    await Task.updateMany(
      {
        assignedTo: teamMemberId,
        companyName: userCompany,
      },
      updatePayload
    );

    // Handle comments
    if (comment && comment.trim() !== "") {
      const User = require("../models/User");
      const assigner = await User.findById(req.user._id);
      const authorName = assigner
        ? `${assigner.firstName} ${assigner.lastName}`
        : "Unknown";

      await Task.updateMany(
        {
          assignedTo: teamMemberId,
          companyName: userCompany,
        },
        { $push: { comments: { text: comment, author: authorName } } }
      );
    }

    res.json({ message: "Tasks updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error updating tasks.", error });
  }
};

exports.deleteTasksByTeamMemberId = async (req, res) => {
  try {
    const { teamMemberId } = req.params;

    const userCompany = req.user.companyName;
    const tasks = await Task.find({
      assignedTo: teamMemberId,
      companyName: userCompany,
    });
    if (tasks.length === 0) {
      return res
        .status(404)
        .json({ message: "No tasks found for the given teamMemberId." });
    }

    const isAuthorized =
      req.user.role.toLowerCase() === "owner" ||
      req.user.role.toLowerCase() === "admin";

    if (!isAuthorized) {
      const unauthorizedTask = tasks.find(
        (task) => String(task.assignedBy) !== String(req.user._id)
      );
      if (unauthorizedTask) {
        return res
          .status(403)
          .json({ message: "Not authorized to delete some tasks." });
      }
    }

    await Task.deleteMany({
      assignedTo: teamMemberId,
      companyName: userCompany,
    });
    res.json({ message: "All tasks for this team member have been deleted." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting tasks.", error });
  }
};

exports.updateTaskById = async (req, res) => {
  try {
    const { task_id } = req.params;
    const currentUserRole = req.user.role;
    const currentUserTeamMemberId = req.user.teamMemberId;

    if (!task_id || task_id.trim() === "") {
      return res.status(400).json({ message: "task_id is required." });
    }

    const userCompany = req.user.companyName;
    const task = await Task.findOne({
      task_id,
      companyName: userCompany,
    });

    if (!task) {
      return res
        .status(404)
        .json({ message: "Task not found with the given task_id." });
    }

    const assignedToId = task.assignedTo;
    const isOwner = currentUserRole === "owner";
    const isAdmin = currentUserRole === "admin";
    const isManager = currentUserRole === "manager";
    const isTeamLead = currentUserRole === "team_lead";
    const isTeamMember = currentUserRole === "teamMember";
    const isUpdatingOwnTask = assignedToId === currentUserTeamMemberId;

    // Restriction logic
    if (isTeamMember && !isUpdatingOwnTask) {
      return res.status(403).json({
        message: "Team members can only update their own task status.",
      });
    }

    if (
      (isAdmin && task.assignedByRole === "owner") ||
      (isManager && task.assignedByRole === "owner") ||
      (isTeamLead &&
        (task.assignedByRole === "owner" || task.assignedByRole === "admin")) ||
      (isTeamLead && isUpdatingOwnTask) // team_lead cannot update own tasks
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this task." });
    }

    // Build update payload
    const {
      title,
      description,
      status,
      assignedTo,
      assignedBy,
      assignedByRole,
      project,
      priority,
      dueDate,
      completedAt,
      comments,
    } = req.body;

    const updatePayload = {};

    // If team member, allow only status
    if (isTeamMember) {
      if (typeof status === "string") {
        updatePayload.status = status;
      } else {
        return res
          .status(400)
          .json({ message: "Team members can only update the status field." });
      }
    } else {
      if (title) updatePayload.title = title;
      if (description) updatePayload.description = description;
      if (status) updatePayload.status = status;
      if (assignedTo) updatePayload.assignedTo = assignedTo;
      if (assignedBy) updatePayload.assignedBy = assignedBy;
      if (assignedByRole) updatePayload.assignedByRole = assignedByRole;
      if (project) updatePayload.project = project;
      if (priority) updatePayload.priority = priority;
      if (dueDate) updatePayload.dueDate = dueDate;
      if (completedAt) updatePayload.completedAt = completedAt;
      if (comments) updatePayload.comments = comments;
    }

    const updatedTask = await Task.findOneAndUpdate(
      {
        task_id,
        companyName: userCompany,
      },
      updatePayload,
      {
        new: true,
      }
    );

    res.json({ message: "Task updated successfully.", task: updatedTask });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating task.", error });
  }
};

exports.deleteTaskById = async (req, res) => {
  try {
    const { task_id } = req.params; // ✅ Get from URL param
    const { reason } = req.body;

    if (!task_id || task_id.trim() === "") {
      return res.status(400).json({ message: "task_id is required." });
    }

    const userRole = req.user.role.toLowerCase();

    // ❌ Team members cannot delete any task
    if (userRole === "teamMember") {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete tasks." });
    }

    const userCompany = req.user.companyName;
    const task = await Task.findOne({
      task_id,
      companyName: userCompany,
    });

    if (!task) {
      return res
        .status(404)
        .json({ message: "Task not found with the given task_id." });
    }

    // Fetch assignee employee
    const assignee = await Employee.findOne({ teamMemberId: task.assignedTo });

    if (!assignee) {
      return res
        .status(404)
        .json({ message: "Assignee of the task not found." });
    }

    const assigneeRole = assignee.role.toLowerCase();

    // 🔐 Role-based permission checks
    if (userRole === "admin" || userRole === "manager") {
      if (!["team_lead", "teamMember"].includes(assigneeRole)) {
        return res.status(403).json({
          message:
            "Admins and managers can only delete tasks of team_leads or team members.",
        });
      }
    } else if (userRole === "team_lead") {
      if (assignee._id.toString() === req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "Team leads cannot delete their own tasks." });
      }
      if (assigneeRole !== "teamMember") {
        return res.status(403).json({
          message: "Team leads can only delete tasks assigned to team members.",
        });
      }
    }

    // Soft-delete the task
    task.status = "deleted";
    if (reason) {
      task.deletionReason = reason;
    }

    await task.save();

    await Activity.create({
      type: "Task",
      action: "delete",
      name: task.title,
      description: `Task ${task.title} marked as deleted.`,
      performedBy: getPerformer(req.user),
      companyName: req.user.companyName,
    });

    res.status(200).json({ message: "Task marked as deleted.", task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting task.", error });
  }
};

exports.getTasksByMemberInProject = async (req, res) => {
  try {
    const { teamMemberId, projectId } = req.params;

    // 🔐 Role-based access control
    if (
      req.user.role === "teamMember" &&
      req.user.teamMemberId !== teamMemberId
    ) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Validate employee
    const employee = await Employee.findOne({ teamMemberId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    // Validate project
    const userCompany = req.user.companyName;
    const project = await Project.findOne({
      project_id: projectId,
      companyName: userCompany,
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const tasks = await Task.find({
      assignedTo: teamMemberId,
      project: projectId,
      status: { $ne: "deleted" },
      companyName: userCompany,
    });

    if (!tasks.length) {
      return res
        .status(404)
        .json({ message: "No tasks found for this employee in this project." });
    }

    res.status(200).json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching tasks.", error });
  }
};
