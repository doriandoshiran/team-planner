import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]); // Always initialize as array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    position: '',
    role: 'user'
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching users from API...');
      
      // Call the actual backend endpoint
      const response = await api.get('/auth/users');
      
      console.log('API Response:', response.data);
      
      // Handle different response structures
      let usersData = [];
      
      if (response.data && response.data.success) {
        // If response has success flag and data property
        if (Array.isArray(response.data.data)) {
          usersData = response.data.data;
        } else if (Array.isArray(response.data.users)) {
          usersData = response.data.users;
        }
      } else if (Array.isArray(response.data)) {
        // If response is directly an array
        usersData = response.data;
      }
      
      console.log('Processed users data:', usersData);
      
      // Ensure we always set an array
      setUsers(Array.isArray(usersData) ? usersData : []);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Always set users to empty array on error
      setUsers([]);
      
      if (error.response?.status === 403) {
        setError('Access denied. Admin role required.');
      } else if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (error.response?.status === 404) {
        setError('Users endpoint not found. Please check backend configuration.');
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  const UserAvatar = ({ user }) => {
    if (!user || !user.name) {
      return (
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #e5e7eb'
        }}>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>?</span>
        </div>
      );
    }

    return (
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        {user.avatar && user.avatar.data ? (
          <img 
            src={`data:${user.avatar.contentType};base64,${user.avatar.data.toString('base64')}`}
            alt={`${user.name}'s avatar`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white',
          display: (user.avatar && user.avatar.data) ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/register', newUser);
      
      if (response.data.success) {
        setNewUser({
          name: '',
          email: '',
          password: '',
          department: '',
          position: '',
          role: 'user'
        });
        setShowAddForm(false);
        fetchUsers();
        setError('');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setError(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      // For now, just refresh the list since we don't have update endpoints
      setEditingUser(null);
      fetchUsers();
      setError('');
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await api.delete(`/auth/users/${userId}`);
      
      if (response.data.success) {
        fetchUsers();
        setError('');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.message || 'Delete functionality not yet implemented');
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      const response = await api.put(`/auth/users/${user._id}/status`, {
        isActive: !user.isActive
      });
      
      if (response.data.success) {
        fetchUsers();
        setError('');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError(error.response?.data?.message || 'Status toggle functionality not yet implemented');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px'
      }}>
        <div>Loading users...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px', fontWeight: '700' }}>
          User Management
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {showAddForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#374151' }}>Add New User</h3>
          <form onSubmit={handleAddUser}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Add User
            </button>
          </form>
        </div>
      )}

      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#f9fafb',
          padding: '12px 20px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          color: '#374151'
        }}>
          Users ({users.length})
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#374151'
                }}>Avatar</th>
                <th style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#374151'
                }}>Name</th>
                <th style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#374151'
                }}>Email</th>
                <th style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#374151'
                }}>Role</th>
                <th style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#374151'
                }}>Status</th>
                <th style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#374151'
                }}>Last Login</th>
                <th style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  color: '#374151'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users && users.length > 0 ? users.map((user, index) => (
                <tr key={user._id || user.id || index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <UserAvatar user={user} />
                  </td>
                  <td style={{ padding: '12px 20px', fontWeight: '500' }}>
                    {editingUser && editingUser._id === user._id ? (
                      <input
                        type="text"
                        value={editingUser.name || ''}
                        onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    ) : (
                      user.name || 'N/A'
                    )}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#6b7280' }}>
                    {user.email || 'N/A'}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    {editingUser && editingUser._id === user._id ? (
                      <select
                        value={editingUser.role || 'user'}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: user.role === 'admin' ? '#fef3c7' : user.role === 'manager' ? '#dbeafe' : '#f3f4f6',
                        color: user.role === 'admin' ? '#92400e' : user.role === 'manager' ? '#1e40af' : '#374151'
                      }}>
                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <button
                      onClick={() => toggleUserStatus(user)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        background: user.isActive !== false ? '#d1fae5' : '#fee2e2',
                        color: user.isActive !== false ? '#065f46' : '#991b1b'
                      }}
                    >
                      {user.isActive !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 20px', color: '#6b7280', fontSize: '12px' }}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {editingUser && editingUser._id === user._id ? (
                        <>
                          <button
                            onClick={handleEditUser}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            style={{
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingUser({...user, originalRole: user.role})}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id || user.id)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#6b7280'
                  }}>
                    No users found. {error ? 'Please check the error message above.' : 'Add some users to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
