import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'pending' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Add task
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      await fetchTasks();
      setNewTask({ title: '', description: '', status: 'pending' });
    } catch (err) {
      setError(err.message);
    }
  };

  // Update task status
  const updateTaskStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Failed to update task');
      
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete task
  const deleteTask = async (id) => {
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete task');
      
      await fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Task Manager</h1>
      </header>
      
      <div className="container">
        {error && <p className="error">{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <h2>Add New Task</h2>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description:</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Status:</label>
            <select
              value={newTask.status}
              onChange={(e) => setNewTask({...newTask, status: e.target.value})}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <button type="submit">Add Task</button>
        </form>
        
        <div className="task-list">
          <h2>Tasks</h2>
          {loading ? <p>Loading tasks...</p> : (
            tasks.length === 0 ? <p>No tasks available</p> : (
              tasks.map(task => (
                <div key={task._id} className={`task-card ${task.status}`}>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <div className="task-footer">
                    <div className="status-controls">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <button onClick={() => deleteTask(task._id)} className="delete-btn">Delete</button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default App;