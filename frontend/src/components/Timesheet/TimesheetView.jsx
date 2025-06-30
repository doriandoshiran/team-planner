import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Calendar, Save } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { getTimeEntries, createTimeEntry, updateTimeEntry } from '../../services/timesheetService';
import { getTasks } from '../../services/taskService';

const TimesheetView = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [totals, setTotals] = useState({ daily: {}, tasks: {}, week: 0 });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  useEffect(() => {
    calculateTotals();
  }, [timeEntries]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch time entries for the week
      const entriesResponse = await getTimeEntries({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd')
      });

      // Fetch user's assigned tasks
      const tasksResponse = await getTasks({ 
        assignee: 'me',
        status: ['todo', 'in_progress', 'review']
      });

      // Organize entries by task and date
      const organized = {};
      entriesResponse.data.entries.forEach(entry => {
        const key = `${entry.task || 'no-task'}_${entry.date}`;
        organized[key] = entry;
      });

      setTimeEntries(organized);
      setTasks(tasksResponse.data.tasks);
    } catch (error) {
      console.error('Error fetching timesheet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const daily = {};
    const tasks = {};
    let week = 0;

    weekDays.forEach(day => {
      daily[format(day, 'yyyy-MM-dd')] = 0;
    });

    Object.entries(timeEntries).forEach(([key, entry]) => {
      if (entry.hours) {
        daily[entry.date] = (daily[entry.date] || 0) + entry.hours;
        tasks[entry.task] = (tasks[entry.task] || 0) + entry.hours;
        week += entry.hours;
      }
    });

    setTotals({ daily, tasks, week });
  };

  const handleCellClick = (taskId, date) => {
    setEditingCell(`${taskId}_${format(date, 'yyyy-MM-dd')}`);
  };

  const handleCellBlur = async (taskId, date, value) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${taskId}_${dateStr}`;
    const hours = parseFloat(value) || 0;

    try {
      if (timeEntries[key]) {
        // Update existing entry
        if (hours === 0) {
          // Delete entry if hours is 0
          await updateTimeEntry(timeEntries[key]._id, { hours: 0 });
          const newEntries = { ...timeEntries };
          delete newEntries[key];
          setTimeEntries(newEntries);
        } else {
          const updated = await updateTimeEntry(timeEntries[key]._id, { hours });
          setTimeEntries({
            ...timeEntries,
            [key]: { ...timeEntries[key], hours }
          });
        }
      } else if (hours > 0) {
        // Create new entry
        const newEntry = await createTimeEntry({
          task: taskId,
          date: dateStr,
          hours,
          project: tasks.find(t => t._id === taskId)?.project
        });
        setTimeEntries({
          ...timeEntries,
          [key]: newEntry.data
        });
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
    }

    setEditingCell(null);
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-gray-100 text-gray-600',
      'submitted': 'bg-blue-100 text-blue-600',
      'approved': 'bg-green-100 text-green-600',
      'rejected': 'bg-red-100 text-red-600'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Timesheet</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleCurrentWeek}
                className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="text-lg font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Week Summary */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Total Hours:</span>
            <span className="font-semibold">{totals.week.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Billable:</span>
            <span className="font-semibold">{(totals.week * 0.8).toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span className="text-gray-600">Non-billable:</span>
            <span className="font-semibold">{(totals.week * 0.2).toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Timesheet Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 w-1/3">
                  Task / Location
                </th>
                {weekDays.map(day => (
                  <th key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-900 w-24">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                      <div className={`font-semibold ${isSameDay(day, new Date()) ? 'text-blue-600' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 w-20">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">No tasks assigned</p>
                    <p className="text-sm mt-1">You haven't been assigned any tasks for this week</p>
                  </td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: task.project?.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.project?.name}</div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const key = `${task._id}_${dateStr}`;
                      const entry = timeEntries[key];
                      const isEditing = editingCell === key;

                      return (
                        <td key={day} className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              defaultValue={entry?.hours || ''}
                              onBlur={(e) => handleCellBlur(task._id, day, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.target.blur();
                                }
                              }}
                              className="w-16 px-2 py-1 text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => handleCellClick(task._id, day)}
                              className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                            >
                              {entry?.hours || '-'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-semibold">
                      {totals.tasks[task._id]?.toFixed(1) || '0.0'}
                    </td>
                  </tr>
                ))
              )}
              {/* Daily Totals Row */}
              {tasks.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-right">Daily Total</td>
                  {weekDays.map(day => (
                    <td key={day} className="px-4 py-3 text-center">
                      {totals.daily[format(day, 'yyyy-MM-dd')]?.toFixed(1) || '0.0'}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-blue-600">
                    {totals.week.toFixed(1)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Task
          </button>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Save Draft
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Save className="w-4 h-4" />
              Submit Timesheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetView;