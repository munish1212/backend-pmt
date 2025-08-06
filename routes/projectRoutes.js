const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");

const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const { addProjectPhase } = require("../controllers/projectController");
const { updatePhaseStatus } = require("../controllers/projectController");
const { updateSubtaskStatus } = require("../controllers/projectController");
const { editSubtask } = require("../controllers/projectController");
const { deleteSubtask } = require("../controllers/projectController");

router.post("/add", authMiddleware, projectController.createProject); // ✅ add project
router.get("/:projectId", authMiddleware, projectController.getProjectById); // ✅ get project by ID
router.get("/", authMiddleware, projectController.getAllProjects); // ✅ get all projects
router.put("/:projectId", authMiddleware, projectController.updateProject); // ✅ update project
router.delete("/:projectId", authMiddleware, projectController.deleteProject); // ✅ delete project
router.delete(
  "/:projectId/permanent",
  authMiddleware,
  projectController.permanentlyDeleteProject
); // ✅ permanently delete project
router.get(
  "/team-member/:teamMemberId/projects",
  authMiddleware,
  projectController.getProjectsByTeamMember
); // ✅ get projects by team member
router.post("/add-phase", authMiddleware, addProjectPhase); // ✅ add project phase
router.post("/update-phase-status", authMiddleware, updatePhaseStatus); // ✅ update phase status
router.get(
  "/phases/:projectId",
  authMiddleware,
  projectController.getProjectPhases
);
router.post(
  "/delete-phase",
  authMiddleware,
  projectController.deleteProjectPhase
); // ✅ delete project phase
router.post(
  "/subtask/add",
  authMiddleware,
  upload.array("images", 2), // Changed from 5 to 2
  projectController.addSubtask
); // ✅ add subtask
router.post(
  "/subtask/update-status",
  authMiddleware,
  projectController.updateSubtaskStatus
); // ✅ update subtask status
router.post(
  "/subtask/edit",
  authMiddleware,
  upload.array("images", 2),
  projectController.editSubtask
); // ✅ edit subtask
router.post("/subtask/delete", authMiddleware, projectController.deleteSubtask); // ✅ delete subtask
router.get(
  "/subtasks/:project_id",
  authMiddleware,
  projectController.getSubtasksByProjectId
); // ✅ get subtasks by project ID
router.get(
  "/subtask/activity/:subtaskId",
  authMiddleware,
  projectController.getSubtaskActivity
); // ✅ get subtask activity by subtask ID
router.post(
  "/:projectId/phases/:phaseId/comments",
  authMiddleware,
  projectController.addCommentToPhase
); // ✅ add comment to phase
router.get(
  "/:projectId/phases/:phaseId/comments",
  authMiddleware,
  projectController.getPhaseComments
); // ✅ get comments for a phase

module.exports = router;
