const express = require("express");

const Task = require("../models/Task");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["Available", "In Progress", "Completed"];

const getTaskData = (body, isUpdate = false) => {
  const taskData = {};

  if (!isUpdate || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { error: "A task title is required." };
    }
    taskData.title = body.title.trim();
  }

  if (!isUpdate || body.description !== undefined) {
    if (body.description !== undefined && typeof body.description !== "string") {
      return { error: "Description must be text." };
    }
    taskData.description = body.description ? body.description.trim() : "";
  }

  if (body.dueDate !== undefined) {
    if (body.dueDate === "" || body.dueDate === null) {
      taskData.dueDate = null;
    } else {
      const dueDate = new Date(body.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return { error: "Due date must be a valid date." };
      }
      taskData.dueDate = dueDate;
    }
  }

  if (!isUpdate || body.priority !== undefined) {
    const priority = body.priority || "Medium";
    if (!PRIORITIES.includes(priority)) {
      return { error: "Priority must be Low, Medium, or High." };
    }
    taskData.priority = priority;
  }

  if (!isUpdate || body.status !== undefined) {
    const status = body.status || "Available";
    if (!STATUSES.includes(status)) {
      return { error: "Status must be Available, In Progress, or Completed." };
    }
    taskData.status = status;
  }

  if (isUpdate && Object.keys(taskData).length === 0) {
    return { error: "Provide at least one task field to update." };
  }

  return { taskData };
};

router.use(authMiddleware);

router.post("/", async (req, res) => {
  const { error, taskData } = getTaskData(req.body || {});
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const task = await Task.create({ ...taskData, user: req.userId });
    return res.status(201).json({ message: "Task created successfully.", task });
  } catch {
    return res.status(500).json({ message: "Unable to create task." });
  }
});

router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId }).sort({ createdAt: -1 });
    return res.json({ tasks });
  } catch {
    return res.status(500).json({ message: "Unable to retrieve tasks." });
  }
});

router.put("/:id", async (req, res) => {
  const { error, taskData } = getTaskData(req.body || {}, true);
  if (error) {
    return res.status(400).json({ message: error });
  }

  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      taskData,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    return res.json({ message: "Task updated successfully.", task });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Task ID is invalid." });
    }
    return res.status(500).json({ message: "Unable to update task." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    return res.json({ message: "Task deleted successfully." });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Task ID is invalid." });
    }
    return res.status(500).json({ message: "Unable to delete task." });
  }
});

module.exports = router;
