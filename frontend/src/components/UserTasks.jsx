import React, { useEffect, useState } from 'react';
import api from '../services/api';

const UserTasks = ({ currentUser }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    api.get(`/tasks?assignee=${currentUser.id}`)
      .then(res => setTasks(res.data))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (loading) return <div>Loading...</div>;
  if (!tasks.length) return <div>No assigned tasks.</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Assigned Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task._id} className="mb-2 p-2 border rounded">
            <div className="font-semibold">{task.title}</div>
            <div className="text-sm text-gray-600">{task.description}</div>
            {task.project && (
              <div className="text-xs text-gray-500">
                Project: {task.project.name || task.project}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserTasks;
