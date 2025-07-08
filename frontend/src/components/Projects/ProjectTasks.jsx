import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ProjectTasks = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/tasks?project=${projectId}`)
      .then(res => setTasks(res.data))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div>Loading...</div>;
  if (!tasks.length) return <div>No tasks for this project.</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Project Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task._id} className="mb-2 p-2 border rounded">
            <div className="font-semibold">{task.title}</div>
            <div className="text-sm text-gray-600">{task.description}</div>
            <div className="text-xs text-gray-500">
              Assigned to: {task.assignee?.name || task.assignee}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectTasks;
