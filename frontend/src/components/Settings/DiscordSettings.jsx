import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DiscordSettings = () => {
  const [discordId, setDiscordId] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    checkDiscordLink();
  }, []);

  const checkDiscordLink = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsLinked(!!response.data.discordId);
      if (response.data.discordId) {
        setDiscordId(response.data.discordId);
      }
    } catch (error) {
      console.error('Error checking Discord link:', error);
    }
  };

  const linkDiscordAccount = async () => {
    if (!discordId.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Discord ID' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/discord/link', 
        { discordId: discordId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLinked(true);
      setMessage({ type: 'success', text: 'Discord account linked successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to link Discord account' 
      });
    } finally {
      setLoading(false);
    }
  };

  const unlinkDiscordAccount = async () => {
    if (!window.confirm('Are you sure you want to unlink your Discord account?')) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/discord/unlink', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsLinked(false);
      setDiscordId('');
      setMessage({ type: 'success', text: 'Discord account unlinked successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to unlink Discord account' 
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!testMessage.trim()) {
      setMessage({ type: 'error', text: 'Please enter a test message' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/discord/test-notification', 
        { message: testMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Test notification sent successfully!' });
        setTestMessage('');
      } else {
        setMessage({ type: 'error', text: 'Failed to send test notification' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to send test notification' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="discord-settings-container">
      {/* Header */}
      <div className="discord-header">
        <div className="discord-icon">
          <svg className="discord-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div>
          <h3 className="discord-title">Discord Integration</h3>
          <p className="discord-subtitle">
            Connect your Discord account to receive team notifications
          </p>
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`discord-message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Connection Status */}
      <div className="connection-status">
        <div className="status-indicator">
          <div className={`status-dot ${isLinked ? 'connected' : 'disconnected'}`}></div>
          <span className="status-text">
            {isLinked ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        {isLinked && (
          <span className="discord-id">ID: {discordId}</span>
        )}
      </div>

      {/* Link/Unlink Section */}
      {!isLinked ? (
        <div className="link-section">
          <div className="discord-form-group">
            <label htmlFor="discord-id">Discord User ID</label>
            <input
              id="discord-id"
              type="text"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="Enter your Discord User ID"
              className="discord-input"
            />
            <p className="input-help">
              To find your Discord ID: Enable Developer Mode in Discord settings, 
              then right-click your username and select "Copy ID"
            </p>
          </div>
          <button
            onClick={linkDiscordAccount}
            disabled={loading || !discordId.trim()}
            className="link-button"
          >
            {loading ? 'Linking...' : 'Link Discord Account'}
          </button>
        </div>
      ) : (
        <div className="unlink-section">
          <div className="connected-info">
            <p><strong>Your Discord account is successfully linked!</strong></p>
            <p>You'll receive notifications for:</p>
            <ul className="notification-list">
              <li>Schedule changes</li>
              <li>Shift swap requests</li>
              <li>Task assignments</li>
              <li>Team announcements</li>
            </ul>
          </div>
          <button
            onClick={unlinkDiscordAccount}
            disabled={loading}
            className="unlink-button"
          >
            {loading ? 'Unlinking...' : 'Unlink Account'}
          </button>
        </div>
      )}

      {/* Test Notification Section */}
      {isLinked && (
        <div className="test-section">
          <h4 className="test-title">Test Notification</h4>
          <div className="discord-form-group">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter test message"
              className="discord-input"
            />
          </div>
          <button
            onClick={sendTestNotification}
            disabled={loading || !testMessage.trim()}
            className="test-button"
          >
            {loading ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscordSettings;
