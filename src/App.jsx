import { useState, useEffect } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyTask = {
  title: "",
  description: "",
  dueDate: "",
  priority: "Medium",
  status: "Available",
};

const getStoredUser = () => {
  try {
    const savedUser = sessionStorage.getItem("taskbuddy_user");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    sessionStorage.removeItem("taskbuddy_user");
    return null;
  }
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState("Dashboard");
  const [user, setUser] = useState(getStoredUser);
  const [showRegister, setShowRegister] = useState(false);
  const [authData, setAuthData] = useState({ name: "", email: "", password: "" });
  const [newTask, setNewTask] = useState(emptyTask);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const dueSoonCount = tasks.filter((task) => {
    if (task.status === "Completed" || !task.dueDate) {
      return false;
    }

    const dueDate = new Date(task.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate >= today && dueDate <= nextWeek;
  }).length;

  const clearAuthSession = () => {
    sessionStorage.removeItem("taskbuddy_token");
    sessionStorage.removeItem("taskbuddy_user");
    localStorage.removeItem("taskbuddy_user");
    setUser(null);
    setTasks([]);
  };

  const requestApi = async (path, options = {}) => {
    const token = sessionStorage.getItem("taskbuddy_token");

    if (!token) {
      clearAuthSession();
      throw new Error("Your session has expired. Please log in again.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      clearAuthSession();
      throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Unable to complete the request.");
    }

    return data;
  };

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let isCurrent = true;

    const loadTasks = async () => {
      setIsLoading(true);
      setTaskError("");

      try {
        const data = await requestApi("/api/tasks");
        if (isCurrent) {
          setTasks(data.tasks || []);
        }
      } catch (error) {
        if (isCurrent && sessionStorage.getItem("taskbuddy_token")) {
          setTaskError(error.message || "Unable to load tasks.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const handleChange = (e) => {
    setNewTask({
      ...newTask,
      [e.target.name]: e.target.value,
    });
  };

  const resetTaskForm = () => {
    setNewTask(emptyTask);
    setEditingTask(null);
    setShowForm(false);
  };

  const addTask = async (e) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      setTaskError("Please enter a task title.");
      return;
    }

    setIsSaving(true);
    setTaskError("");

    try {
      const data = await requestApi("/api/tasks", {
        method: "POST",
        body: JSON.stringify(newTask),
      });
      setTasks((currentTasks) => [data.task, ...currentTasks]);
      resetTaskForm();
    } catch (error) {
      setTaskError(error.message || "Unable to create task.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTask = async (id) => {
    setIsSaving(true);
    setTaskError("");

    try {
      await requestApi(`/api/tasks/${id}`, { method: "DELETE" });
      setTasks((currentTasks) => currentTasks.filter((task) => task._id !== id));
    } catch (error) {
      setTaskError(error.message || "Unable to delete task.");
    } finally {
      setIsSaving(false);
    }
  };

  const editTask = (task) => {
  setEditingTask(task);

  setNewTask({
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    priority: task.priority,
    status: task.status,
  });

  setShowForm(true);
};

  const updateTaskInApi = async (id, changes) => {
    const data = await requestApi(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    });
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task._id === id ? data.task : task))
    );
  };

  const updateTask = async (e) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      setTaskError("Please enter a task title.");
      return;
    }

    setIsSaving(true);
    setTaskError("");

    try {
      await updateTaskInApi(editingTask._id, newTask);
      resetTaskForm();
    } catch (error) {
      setTaskError(error.message || "Unable to update task.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (id, newStatus) => {
    setIsSaving(true);
    setTaskError("");

    try {
      await updateTaskInApi(id, { status: newStatus });
    } catch (error) {
      setTaskError(error.message || "Unable to update task status.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleComplete = (task) => {
    changeStatus(
      task._id,
      task.status === "Completed" ? "Available" : "Completed"
    );
  };

  const handleAuthChange = (e) => {
    setAuthError("");
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const saveAuthSession = (data) => {
    if (!data.token || !data.user) {
      throw new Error("The server did not create a valid session.");
    }
    sessionStorage.setItem("taskbuddy_token", data.token);
    sessionStorage.setItem("taskbuddy_user", JSON.stringify(data.user));
    localStorage.removeItem("taskbuddy_user");
    setUser(data.user);
  };

  const login = async (credentials) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to log in.");
    }
    saveAuthSession(data);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!authData.name.trim() || !authData.email.trim() || !authData.password.trim()) {
      setAuthError("Please fill in all fields.");
      return;
    }

    setIsAuthenticating(true);
    setAuthError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to create your account.");
      }
      await login({ email: authData.email, password: authData.password });
      setAuthData({ name: "", email: "", password: "" });
    } catch (error) {
      setAuthError(error.message || "Unable to create your account.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authData.email.trim() || !authData.password.trim()) {
      setAuthError("Please enter your email and password.");
      return;
    }

    setIsAuthenticating(true);
    setAuthError("");
    try {
      await login({ email: authData.email, password: authData.password });
      setAuthData({ name: "", email: "", password: "" });
    } catch (error) {
      setAuthError(error.message || "Unable to log in.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
  };
  const filteredTasks =
  filter === "In Progress"
    ? tasks.filter((task) => task.status === "In Progress")
    : filter === "Completed"
    ? tasks.filter((task) => task.status === "Completed")
    : tasks;
if (!user) {
  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="logo-box">✓</div>
          <span>TaskBuddy</span>
        </div>

        <h1>
          {showRegister
            ? "Create your account"
            : "Welcome back"}
        </h1>

        <p className="auth-subtitle">
          {showRegister
            ? "Start managing your tasks today."
            : "Login to continue to your dashboard."}
        </p>

        <form
          onSubmit={
            showRegister
              ? handleRegister
              : handleLogin
          }
        >

          {showRegister && (
            <div className="input-group">
              <label>Full Name</label>

              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={authData.name}
                onChange={handleAuthChange}
              />
            </div>
          )}

          <div className="input-group">
            <label>Email Address</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={authData.email}
              onChange={handleAuthChange}
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={authData.password}
              onChange={handleAuthChange}
            />
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={isAuthenticating}
          >
            {isAuthenticating
              ? "Please wait..."
              : showRegister
              ? "Create Account"
              : "Login"}
          </button>

          {authError && (
            <p className="auth-error" role="alert">
              {authError}
            </p>
          )}

        </form>

        <div className="auth-switch">

          {showRegister
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            onClick={() => {
              setShowRegister(!showRegister);
              setAuthError("");

              setAuthData({
                name: "",
                email: "",
                password: "",
              });
            }}
          >
            {showRegister ? "Login" : "Register"}
          </button>

        </div>

      </div>
    </div>
  );
}
  return (
    <div className="app">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-box">✓</div>
          <span>TaskBuddy</span>
        </div>

        <nav aria-label="Task filters">
         <button
            type="button"
            className={filter === "Dashboard" ? "active" : ""}
            onClick={() => setFilter("Dashboard")}
            aria-pressed={filter === "Dashboard"}
          >
          📊 Dashboard
        </button>
        <button
        type="button"
        className={filter === "All Tasks" ? "active" : ""}
        onClick={() => setFilter("All Tasks")}
        aria-pressed={filter === "All Tasks"}
        >
        📋 All Tasks
        </button>
<button
  type="button"
  className={filter === "In Progress" ? "active" : ""}
  onClick={() => setFilter("In Progress")}
  aria-pressed={filter === "In Progress"}
>
  ⏳ In Progress
</button>
<button
  type="button"
  className={filter === "Completed" ? "active" : ""}
  onClick={() => setFilter("Completed")}
  aria-pressed={filter === "Completed"}
>
  ✅ Completed
</button>
        </nav>

        <div className="sidebar-bottom">
          <span className="sidebar-disabled">⚙️ Settings coming soon</span>
          <button type="button" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">

        {/* Header */}
        <header className="topbar">
          <div>
            <h1>Good evening! 👋</h1>
            <p>Here's what's happening with your tasks today.</p>
          </div>

          <div className="profile">
            <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>

        </header>

        {taskError && (
          <p className="task-message task-error" role="alert">
            {taskError}
          </p>
        )}

        {isLoading && <p className="task-message">Loading your tasks...</p>}

        {/* Statistics */}
        <section className="stats">

          <div className="stat-card">
            <div className="stat-icon blue">📋</div>
            <div>
              <span>Total Tasks</span>
              <h2>{tasks.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">⏳</div>
            <div>
              <span>In Progress</span>
              <h2>
                {tasks.filter(
                  (task) => task.status === "In Progress"
                ).length}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <span>Completed</span>
              <h2>
                {tasks.filter(
                  (task) => task.status === "Completed"
                ).length}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">⚠</div>
            <div>
              <span>Due Soon</span>
              <h2>{dueSoonCount}</h2>
            </div>
          </div>

        </section>

        {/* Tasks */}
        <section className="tasks-section">

          <div className="section-header">

            <div>
              <h2>
  {filter === "Dashboard"
    ? "My Tasks"
    : filter}
</h2>
              <p>Manage and track your daily tasks.</p>
            </div>

            <button
              className="add-btn"
              onClick={() => setShowForm(true)}
            >
              + Add Task
            </button>

          </div>

          {/* Add Task Form */}
          {showForm && (
            <form className="task-form" onSubmit={editingTask ? updateTask : addTask} >

              <h2>{editingTask ? "Edit Task" : "Create New Task"}</h2>

              <input
                type="text"
                name="title"
                placeholder="Task title"
                value={newTask.title}
                onChange={handleChange}
              />

              <textarea
                name="description"
                placeholder="Task description"
                value={newTask.description}
                onChange={handleChange}
              />

              <div className="form-row">

                <input
                  type="date"
                  name="dueDate"
                  value={newTask.dueDate}
                  onChange={handleChange}
                />

                <select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleChange}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>

                <select
                  name="status"
                  value={newTask.status}
                  onChange={handleChange}
                >
                  <option value="Available">Available</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

              </div>

              <div className="form-buttons">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    resetTaskForm();
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingTask
                    ? "Update Task"
                    : "Create Task"}
                </button>

              </div>

            </form>
          )}

          {/* Task List */}
          <div className="tasks">

            {!isLoading && filteredTasks.length === 0 && (
              <p className="empty-tasks">
                {filter === "Dashboard" || filter === "All Tasks"
                  ? "No tasks yet. Create your first task to get started."
                  : `No ${filter.toLowerCase()} tasks yet.`}
              </p>
            )}

            {filteredTasks.map((task) => (

              <div
                className="task-card"
                key={task._id}
              >

                <div className="task-info">

                  <button
                    className={`task-check ${
                      task.status === "Completed"
                        ? "checked"
                        : ""
                    }`}
                    onClick={() => toggleComplete(task)}
                    disabled={isSaving}
                  >
                    {task.status === "Completed" ? "✓" : ""}
                  </button>

                  <div>

                    <h3>{task.title}</h3>

                    <p>{task.description}</p>

                    <div className="task-meta">

                      <span>
                        📅 {task.dueDate ? task.dueDate.slice(0, 10) : "No due date"}
                      </span>

                      <span
                        className={`priority ${task.priority.toLowerCase()}`}
                      >
                        {task.priority} Priority
                      </span>

                    </div>

                  </div>

                </div>

                <div className="task-actions">

                  <select
  className={`status-select ${
    task.status === "Completed"
      ? "completed"
      : task.status === "In Progress"
      ? "progress"
      : "available"
  }`}
  value={task.status}
  onChange={(e) =>
    changeStatus(task._id, e.target.value)
  }
  disabled={isSaving}
>
  <option value="Available">Available</option>
  <option value="In Progress">In Progress</option>
  <option value="Completed">Completed</option>
</select>

                  <button onClick={() => editTask(task)} disabled={isSaving}>
                  ✏️
                  </button>

                  <button
                    onClick={() => deleteTask(task._id)}
                    disabled={isSaving}
                  >
                    🗑️
                  </button>

                </div>

              </div>

            ))}

          </div>

        </section>

      </main>
    </div>
  );
}

export default App;
