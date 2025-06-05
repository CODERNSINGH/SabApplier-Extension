import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AccountDropdown from './components/AccountDropdown';
import Loader from './components/Loader';
import LoginFunction, { EmailLogin } from './api';
import './App.css';


export default function App() {
  const [savedUsers, setSavedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedUsers();
  }, []);

  const loadSavedUsers = () => {
    chrome.storage.local.get(['sabapplier_users'], (result) => {
      const users = result.sabapplier_users || {};
      const entries = Object.entries(users); // [ {name, email}] ]
      setSavedUsers(entries);
    });
  };

  const handleLogin = async (email, name) => {
    const data = await EmailLogin(email)
    setCurrentUser({ email, name });
    loadSavedUsers();
  };

  // Called when user selects account from dropdown
  const handleAccountSelect = async (email) => {
    chrome.storage.local.get(['sabapplier_users'], async (result) => {
      const users = result.sabapplier_users || {};
      const user = users.name;

      if (!user || !user.email) {
        alert('email not found');
        return;
      }

      setLoading(true);
      setStatus('Logging in...');
      try {
        const result = await LoginFunction(email, user.password, (msg) => setStatus(msg));
        setCurrentUser({ email, name: user.name, password: user.password });
        setStatus(result?.message || 'Logged in!');
      } catch (err) {
        alert('Login failed.');
        setStatus('');
      }
      setLoading(false);
    });
  };
  const dummyUsers = [
  ['alice@example.com', { name: 'Alice Wonderland' }],
  ['bob@example.com', { name: 'Bob Builder' }],
  ['carol@example.com', { name: 'Carol Singer' }],
  ['dan@example.com', { name: 'Dan the Man' }],
  ['eve@example.com', { name: 'Eve Hacker' }],
];


  return (
    <div className='app'>
    <div className={` container ${loading ? ' blurred' : ''}`}>
      <div className='logo'>
      <div className='tag'>
      <h1>SabApplier AI</h1>
      <p>India's Leading AI Form Filling</p></div>
      </div>
        {/* for testing i used dummyData */}
        <AccountDropdown users={savedUsers} onSelect={handleAccountSelect} />
    
      <Login onLogin={handleLogin} />
        <a href='https://sabapplier.com/signup'>Don't Have Account</a>
      {status && <p>Status: {status}</p>}
      {currentUser && <p>Logged in as: {currentUser.name} ({currentUser.email})</p>}
      {loading && <Loader message={status} />}
    </div>
    </div>
  );
}