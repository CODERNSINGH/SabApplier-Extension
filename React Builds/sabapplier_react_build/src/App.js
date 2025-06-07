import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AccountDropdown from './components/AccountDropdown';
import Loader from './components/Loader';
import LoginFunction from './services/API/LoginFunction';
import EmailLogin from './services/API/EmailLogin';

import './App.css'



export default function App() {
  const [savedUsers, setSavedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedUsers();
  }, []);

  const loadSavedUsers = () => {
    // Always use chrome.storage.local in extension context
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sabapplier_users'], (result) => {
        const users = result.sabapplier_users || {};
        const entries = Object.entries(users); // [ [email, { name }] ]
        setSavedUsers(entries);
      });
    } else {
      // In production extension, this should never run. For dev, show empty list.
      setSavedUsers([]);
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setStatus('Logging in...');
    try {
      const result = await LoginFunction(email, password, (msg) => setStatus(msg)); // Change this to get Name
      
      console.log('Login result:', result);
      // Handle both possible response formats
      const userName = result?.user_name || result?.name || email.split('@')[0];
      const userEmail = result?.user_email || email;

      // Save in sabapplier_users format
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['sabapplier_users'], (res) => {
          const users = res.sabapplier_users || {};
          users[userEmail] = { name: userName };
          chrome.storage.local.set({ sabapplier_users: users }, () => {
            loadSavedUsers();
          });
        });
      }

      setCurrentUser({ email: userEmail, name: userName });
      setStatus('Login successful!');
      
      return result; // Return the result for the Login component
    } catch (err) {
      setStatus('Login failed: ' + (err.message || 'Unknown error'));
      throw err; // Re-throw so Login component can handle it
    } finally {

      setTimeout(() => {
        setLoading(false);
      }, 3000); // Delay to show status message
    }
  };

  const handleAccountSelect = async (email) => {
    setLoading(true);
    setStatus('Auto logging in...');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['sabapplier_users'], async (result) => {
        const users = result.sabapplier_users || {};
        const user = users[email];

        if (!user) {
          alert('User not found.');
          return;
        }
        try {
          const response = await EmailLogin(email, (msg) => setStatus(msg));
          setCurrentUser({ email, name: user.name });

          if (!response || !response.success) {
            setStatus(response.massage || 'Auto-login failed');
          } else {
            setStatus(response.massage || 'Auto-login successful!, success');
          }
        } catch (err) {
          setStatus('Auto-login failed: ' + (err.message || 'Unknown error'));
        }

        setTimeout(() => {
        setLoading(false);
      }, 3000); // Delay to show status message
      });
    }
  };

  return (
    <div className='app'>
      <div className={`container ${loading ? 'blurred' : ''}`}>
        <div className='logo'>
          <div className='tag'>
            <h1>SabApplier AI</h1>
            <p>India's Leading AI Form Filling</p>
          </div>
        </div>

        <AccountDropdown users={savedUsers} onSelect={handleAccountSelect} />
        <Login onLogin={handleLogin} />

        <a href='https://sabapplier.com/signup'>Don't Have Account</a>
        {/* {status && <p>Status: {status}</p>}  Massage From Backend */}
        {/* {currentUser && <p>Logged in as: {currentUser.name} ({currentUser.email})</p>} */}
        {loading && <Loader message={status || currentUser.name || currentUser.mail} />}
      </div>
    </div>
  );
}