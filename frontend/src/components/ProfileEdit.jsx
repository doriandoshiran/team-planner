import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DiscordSettings from './Settings/DiscordSettings';
import './ProfileEdit.css';

const ProfileEdit = ({ onClose }) => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    contacts: {
      email: '',
      phone: '',
      linkedin: '',
      github: ''
    },
    cybersecuritySkills: [],
    ctfs: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newCtf, setNewCtf] = useState({ name: '', year: '', rank: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('No authentication token found. Please log in again.');
        return;
      }

      console.log('Fetching profile...');
      
      const response = await axios.get('/api/auth/me', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Profile response:', response.data);
      
      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        bio: response.data.bio || '',
        contacts: response.data.contacts || {
          email: '',
          phone: '',
          linkedin: '',
          github: ''
        },
        cybersecuritySkills: response.data.cybersecuritySkills || [],
        ctfs: response.data.ctfs || []
      });

      // Handle avatar display - check multiple possible formats
      if (response.data.avatarUrl) {
        console.log('Setting avatar preview from avatarUrl');
        setAvatarPreview(response.data.avatarUrl);
      } else if (response.data.avatar && response.data.avatar.data && response.data.avatar.contentType) {
        console.log('Setting avatar preview from avatar data');
        const dataUrl = `data:${response.data.avatar.contentType};base64,${response.data.avatar.data}`;
        setAvatarPreview(dataUrl);
      } else {
        console.log('No avatar found');
        setAvatarPreview(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      if (error.response?.status === 401) {
        setMessage('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (error.response?.status === 404) {
        setMessage('User profile not found.');
      } else if (error.response?.data?.message) {
        setMessage('Error loading profile: ' + error.response.data.message);
      } else {
        setMessage('Error loading profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    setProfile(prev => {
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      } else {
        return {
          ...prev,
          [name]: value
        };
      }
    });
  }, []);

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setMessage('Please select an image file');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
      setMessage(''); // Clear any previous messages
    }
  }, []);

  const uploadAvatar = useCallback(async () => {
    if (!avatarFile || uploadingAvatar) return;
    
    setUploadingAvatar(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      console.log('Uploading avatar...');
      
      const response = await axios.post('/api/auth/upload-avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Avatar upload response:', response.data);
      
      setMessage('Avatar uploaded successfully!');
      setAvatarFile(null);
      
      // Handle avatar URL from response
      if (response.data.avatarUrl) {
        console.log('Setting avatar preview from upload response');
        setAvatarPreview(response.data.avatarUrl);
      } else {
        // Refresh profile to get updated avatar
        setTimeout(() => {
          fetchProfile();
        }, 1000);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage('Error uploading avatar: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadingAvatar(false);
    }
  }, [avatarFile, uploadingAvatar, fetchProfile]);

  const addSkill = useCallback(() => {
    if (newSkill.trim()) {
      setProfile(prev => ({
        ...prev,
        cybersecuritySkills: [...prev.cybersecuritySkills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  }, [newSkill]);

  const removeSkill = useCallback((index) => {
    setProfile(prev => ({
      ...prev,
      cybersecuritySkills: prev.cybersecuritySkills.filter((_, i) => i !== index)
    }));
  }, []);

  const addCtf = useCallback(() => {
    if (newCtf.name.trim()) {
      setProfile(prev => ({
        ...prev,
        ctfs: [...prev.ctfs, { ...newCtf, year: parseInt(newCtf.year) || new Date().getFullYear() }]
      }));
      setNewCtf({ name: '', year: '', rank: '' });
    }
  }, [newCtf]);

  const removeCtf = useCallback((index) => {
    setProfile(prev => ({
      ...prev,
      ctfs: prev.ctfs.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (saving) return; // Prevent multiple submissions
    
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/auth/profile', {
        bio: profile.bio,
        contacts: profile.contacts,
        cybersecuritySkills: profile.cybersecuritySkills,
        ctfs: profile.ctfs
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  }, [profile.bio, profile.contacts, profile.cybersecuritySkills, profile.ctfs, saving]);

  if (loading && !profile.name) {
    return (
      <div className="profile-edit-overlay">
        <div className="profile-edit-modal">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-edit-overlay">
      <div className="profile-edit-modal">
        <div className="profile-edit-header">
          <h2>Edit Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'discord' ? 'active' : ''}`}
            onClick={() => setActiveTab('discord')}
          >
            Discord
          </button>
        </div>
        
        {message && (
          <div className={`message ${message.includes('Error') || message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        
        {activeTab === 'profile' ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="avatar-section">
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar" 
                    className="avatar-image"
                    onError={(e) => {
                      console.error('Avatar preview failed to load:', avatarPreview);
                      setAvatarPreview(null);
                    }}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="avatar-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  id="avatar-input"
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar-input" className="upload-btn">
                  Choose Avatar
                </label>
                {avatarFile && (
                  <button
                    type="button"
                    onClick={uploadAvatar}
                    disabled={uploadingAvatar}
                    className="upload-confirm-btn"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={profile.bio || ''}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                maxLength={1000}
                rows={4}
              />
            </div>

            <div className="contacts-section">
              <h3>Contact Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="contacts.email"
                    value={profile.contacts?.email || ''}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="contacts.phone"
                    value={profile.contacts?.phone || ''}
                    onChange={handleInputChange}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>LinkedIn</label>
                  <input
                    type="url"
                    name="contacts.linkedin"
                    value={profile.contacts?.linkedin || ''}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="form-group">
                  <label>GitHub</label>
                  <input
                    type="url"
                    name="contacts.github"
                    value={profile.contacts?.github || ''}
                    onChange={handleInputChange}
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>
            </div>

            <div className="skills-section">
              <h3>Cybersecurity Skills</h3>
              <div className="add-skill">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <button type="button" onClick={addSkill} className="add-btn">Add</button>
              </div>
              <div className="skills-list">
                {profile.cybersecuritySkills?.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                    <button type="button" onClick={() => removeSkill(index)} className="remove-btn">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="ctfs-section">
              <h3>CTF Participation</h3>
              <div className="add-ctf">
                <input
                  type="text"
                  value={newCtf.name}
                  onChange={(e) => setNewCtf(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="CTF Name"
                />
                <input
                  type="number"
                  value={newCtf.year}
                  onChange={(e) => setNewCtf(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="Year"
                  min="2000"
                  max="2030"
                />
                <input
                  type="text"
                  value={newCtf.rank}
                  onChange={(e) => setNewCtf(prev => ({ ...prev, rank: e.target.value }))}
                  placeholder="Rank/Position"
                />
                <button type="button" onClick={addCtf} className="add-btn">Add CTF</button>
              </div>
              <div className="ctfs-list">
                {profile.ctfs?.map((ctf, index) => (
                  <div key={index} className="ctf-item">
                    <span><strong>{ctf.name}</strong> ({ctf.year}) - {ctf.rank}</span>
                    <button type="button" onClick={() => removeCtf(index)} className="remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="cancel-btn">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="save-btn">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="discord-tab-content">
            <DiscordSettings />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEdit;
