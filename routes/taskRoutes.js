const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { isAuthorizedToAssign, isSelfAssignment } = require('../middleware/taskAuthMiddleware');
const taskController = require('../controllers/taskController');

// 🔹 Create a new task (Owner/Admin/TeamLead - cannot assign to self)
router.post('/createTask', authMiddleware, isAuthorizedToAssign, isSelfAssignment,taskController.createTask);

// 🔹 Get all tasks assigned to the logged-in employee
router.get('/my-tasks', authMiddleware, taskController.getTasksForSelf);

// 🔹 Get all tasks in the system (Owner/Admin/TeamLead only)
router.get('/all', authMiddleware, isAuthorizedToAssign, taskController.getAllTasks);

// 🔹 Get all tasks assigned to a specific employee (by teamMemberId) — only returning tasks with status "completed" or "deleted"
router.get('/history/:teamMemberId', authMiddleware, isAuthorizedToAssign, taskController.getTaskHistoryByMemberId);

// 🔹 Get ongoing tasks (can be used by any role if needed)
router.get('/ongoing', authMiddleware, taskController.getOngoingTasks);

// 🔹 Update task(s) for a team member (includes reassignment/status update)[currently not being used]
router.put('/update/:teamMemberId', authMiddleware, isAuthorizedToAssign, taskController.updateTasksByTeamMemberId);

// 🔹 Update a single task by its taskId
router.put('/updateTask/:task_id', authMiddleware, isAuthorizedToAssign, taskController.updateTaskById);

// 🔹 Delete all tasks assigned to a team member
router.delete('/delete/:teamMemberId',  authMiddleware, isAuthorizedToAssign, taskController.deleteTasksByTeamMemberId);

// 🔹 Delete a single task by its taskId
router.post('/deleteTask/:task_id', authMiddleware, isAuthorizedToAssign, taskController.deleteTaskById);

// 🔹 Get tasks assigned to a specific team member in a specific project
router.get("/:teamMemberId/project/:projectId", authMiddleware, taskController.getTasksByMemberInProject);

module.exports = router;