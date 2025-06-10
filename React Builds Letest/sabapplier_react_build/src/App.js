import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import AccountDropdown from './components/AccountDropdown';
import Loader from './components/Loader';
import Dashboard from './components/Dashboard';
import LoginFunction from './services/API/LoginFunction';
import EmailLogin from './services/API/EmailLogin';

import './App.css';

export default function App() {
  const [savedUsers, setSavedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedUsers();
    loadLastUser();
  }, []);

  const loadSavedUsers = () => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(['sabapplier_users'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading saved users:', chrome.runtime.lastError);
          return;
        }
        const users = result.sabapplier_users || {};
        setSavedUsers(Object.entries(users)); // [ [email, { name }] ]
      });
    } else {
      console.warn('Chrome storage not available');
      setSavedUsers([]);
    }
  };

  const loadLastUser = () => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(['sabapplier_last_user'], (res) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading last user:', chrome.runtime.lastError);
          return;
        }
        const lastUser = res.sabapplier_last_user;
        if (lastUser && lastUser.email && lastUser.name) {
          setCurrentUser(lastUser);
          navigate('/dashboard');
        }
      });
    }
  };

  const saveUserToStorage = (userEmail, userName) => {
    return new Promise((resolve, reject) => {
      if (!chrome?.storage?.local) {
        reject(new Error('Chrome storage not available'));
        return;
      }

      // First, get existing users
      chrome.storage.local.get(['sabapplier_users'], (res) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        const users = res.sabapplier_users || {};
        users[userEmail] = { name: userName };

        // Save updated users list
        chrome.storage.local.set({ sabapplier_users: users }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          // Also save as last user
          chrome.storage.local.set({ sabapplier_last_user: { email: userEmail, name: userName } }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve();
          });
        });
      });
    });
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setStatus('Logging in...');
    try {
      const result = await LoginFunction(email, password, (msg) => setStatus(msg));
      const userName = result?.user_name || result?.name || email.split('@')[0];
      const userEmail = result?.user_email || email;

      if (result) {
        // Save to storage with proper error handling only if login is successful
        alert(result);
        try {
          await saveUserToStorage(userEmail, userName);
          // Reload saved users to update UI
          loadSavedUsers();
        } catch (storageError) {
          console.error('Failed to save user to storage:', storageError);
          // Continue with login even if storage fails
        }

        setCurrentUser({ email: userEmail, name: userName });
        navigate('/dashboard');
      } else {
        setStatus("Failed to Connect server or Invalid Credentials");
        setTimeout(() => setLoading(false), 3000);
      }
      
      return result;
    } catch (err) {
      setStatus('Login failed: ' + (err.message || 'Unknown error'));
      throw err;
    } finally {
      setTimeout(() => setLoading(false), 3000);
    }
  };

  const handleAccountSelect = async (email) => {
    setLoading(true);
    setStatus('Auto logging in...');
    
    if (!chrome?.storage?.local) {
      setStatus('Chrome storage not available');
      setTimeout(() => setLoading(false), 3000);
      return;
    }

    chrome.storage.local.get(['sabapplier_users'], async (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error accessing storage:', chrome.runtime.lastError);
        setStatus('Storage access failed');
        setTimeout(() => setLoading(false), 3000);
        return;
      }

      const users = result.sabapplier_users || {};
      const user = users[email];

      // if (!user) {
      //   alert('User not found.');
      //   setLoading(false);
      //   return;
      // }

      try {
        const response = await EmailLogin(email, (msg) => setStatus(msg));
        const currentUserData = { email, name: response?.user_name || "User" };
        setCurrentUser(currentUserData);
        setStatus(response?.massage || 'Auto-login successful!');
        
        // Update last user in storage
        chrome.storage.local.set({ sabapplier_last_user: currentUserData }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to save last user:', chrome.runtime.lastError);
          }
        });
        
        navigate('/dashboard');
      } catch (err) {
        setStatus('Auto-login failed: ' + (err.message || 'Unknown error'));
      }

      setTimeout(() => setLoading(false), 3000);
    });
  };

  const handleLogout = () => {
    // Only clear the current session, NOT the saved users list
    setCurrentUser(null);
    
    // Clear only the last user (current session) from storage
    if (chrome?.storage?.local) {
      chrome.storage.local.remove(['sabapplier_last_user'], () => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing last user:', chrome.runtime.lastError);
        }
      });
    }
    
    navigate('/');
  };

  // Optional: Add a function to completely clear all saved users (if needed)
  const handleClearAllUsers = () => {
    if (chrome?.storage?.local) {
      chrome.storage.local.remove(['sabapplier_users', 'sabapplier_last_user'], () => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing all users:', chrome.runtime.lastError);
        } else {
          setSavedUsers([]);
          setCurrentUser(null);
          navigate('/');
        }
      });
    }
  };

  return (
    <div className='app'>
      <div className={`container ${loading ? 'blurred' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={
              currentUser ? (
                <Navigate to="/dashboard" />
              ) : (
                <>
                  <div className='logo'>
                    <div className='tag'>
                      <h1>SabApplier AI</h1>
                      <p>India's Leading AI Form Filling</p>
                    </div>
                  </div>
                  <AccountDropdown users={savedUsers} onSelect={handleAccountSelect} />
                  <Login onLogin={handleLogin} />
                  <a href='https://sabapplier.com/signup' target='_blank' rel='noopener noreferrer'>
                    Don't Have Account
                  </a>
                </>
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              currentUser ? (
                <Dashboard 
                  user={currentUser} 
                  onLogout={handleLogout}
                  // Optional: pass clear function if you want to provide this option
                  onClearAllUsers={handleClearAllUsers}
                />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
        {loading && <Loader message={status || currentUser?.name || currentUser?.email} />}
      </div>
    </div>
  );
}




// import React, { useState, useEffect } from 'react';
// import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
// import Login from './components/Login';
// import AccountDropdown from './components/AccountDropdown';
// import Loader from './components/Loader';
// import Dashboard from './components/Dashboard';
// import LoginFunction from './services/API/LoginFunction';
// import EmailLogin from './services/API/EmailLogin';

// import './App.css';

// export default function App() {
//   const [savedUsers, setSavedUsers] = useState([]);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [status, setStatus] = useState('');
//   const [loading, setLoading] = useState(false);
//   const navigate = useNavigate();

//   useEffect(() => {
//     loadSavedUsers();
//     loadLastUser();
//   }, []);

//   // const loadSavedUsers = () => {
//   //   if (chrome?.storage?.local) {
//   //     chrome.storage.local.get(['sabapplier_users'], (result) => {
//   //       if (chrome.runtime.lastError) {
//   //         console.error('Error loading saved users:', chrome.runtime.lastError);
//   //         return;
//   //       }
//   //       const users = result.sabapplier_users || {};
//   //       setSavedUsers(Object.entries(users)); // [ [email, { name }] ]
//   //     });
//   //   } else {
//   //     console.warn('Chrome storage not available');
//   //     setSavedUsers([]);
//   //   }
//   // };
//   const loadSavedUsers = () => {
//   if (chrome?.storage?.local) {
//     chrome.storage.local.get(['sabapplier_users'], (result) => {
//       if (chrome.runtime.lastError) {
//         console.error('Error loading saved users:', chrome.runtime.lastError);
//         return;
//       }
      
//       let users = result.sabapplier_users || {};
      
//       // Check if users is empty and add default user
//       if (Object.keys(users).length === 0) {
//         users['test001@gmail.com'] = { name: 'Narendra Singh' };
        
//         // Save the default user to storage
//         chrome.storage.local.set({ sabapplier_users: users }, () => {
//           if (chrome.runtime.lastError) {
//             console.error('Error saving default user:', chrome.runtime.lastError);
//             return;
//           }
//           setSavedUsers(Object.entries(users));
//         });
//       } else {
//         setSavedUsers(Object.entries(users));
//       }
//     });
//   } else {
//     console.warn('Chrome storage not available');
//     setSavedUsers([]);
//   }
// };

//   const loadLastUser = () => {
//     if (chrome?.storage?.local) {
//       chrome.storage.local.get(['sabapplier_last_user'], (res) => {
//         if (chrome.runtime.lastError) {
//           console.error('Error loading last user:', chrome.runtime.lastError);
//           return;
//         }
//         const lastUser = res.sabapplier_last_user;
//         if (lastUser && lastUser.email && lastUser.name) {
//           setCurrentUser(lastUser);
//           navigate('/dashboard');
//         }
//       });
//     }
//   };

//   const saveUserToStorage = (userEmail, userName) => {
//     return new Promise((resolve, reject) => {
//       if (!chrome?.storage?.local) {
//         reject(new Error('Chrome storage not available'));
//         return;
//       }

//       chrome.storage.local.get(['sabapplier_users'], (res) => {
//         if (chrome.runtime.lastError) {
//           reject(chrome.runtime.lastError);
//           return;
//         }

//         const users = res.sabapplier_users || {};
//         users[userEmail] = { name: userName };

//         chrome.storage.local.set({ sabapplier_users: users }, () => {
//           if (chrome.runtime.lastError) {
//             reject(chrome.runtime.lastError);
//             return;
//           }

//           chrome.storage.local.set({ sabapplier_last_user: { email: userEmail, name: userName } }, () => {
//             if (chrome.runtime.lastError) {
//               reject(chrome.runtime.lastError);
//               return;
//             }
//             resolve();
//           });
//         });
//       });
//     });
//   };

//   const handleLogin = async (email, password) => {
//     setLoading(true);
//     setStatus('Logging in...');
//     try {
//       const result = await LoginFunction(email, password, (msg) => setStatus(msg));
//       if (!result) {
//         setStatus("❌ Failed to connect or invalid credentials.");
//         return;
//       }

//       const userName = result?.user_name || result?.name || email.split('@')[0];
//       const userEmail = result?.user_email || email;

//       try {
//         await saveUserToStorage(userEmail, userName);
//         loadSavedUsers();
//       } catch (storageError) {
//         console.error('Failed to save user to storage:', storageError);
//       }

//       setCurrentUser({ email: userEmail, name: userName });
//       navigate('/dashboard');
//     } catch (err) {
//       setStatus('Login failed: ' + (err.message || 'Unknown error'));
//     } finally {
//       setTimeout(() => setLoading(false), 3000);
//     }
//   };

//   const handleAccountSelect = async (email) => {
//     setLoading(true);
//     setStatus('Auto logging in...');
    
//     if (!chrome?.storage?.local) {
//       setStatus('Chrome storage not available');
//       setTimeout(() => setLoading(false), 3000);
//       return;
//     }

//     chrome.storage.local.get(['sabapplier_users'], async (result) => {
//       if (chrome.runtime.lastError) {
//         console.error('Error accessing storage:', chrome.runtime.lastError);
//         setStatus('Storage access failed');
//         setTimeout(() => setLoading(false), 3000);
//         return;
//       }

//       const user = result.sabapplier_users?.[email];
//       if (!user) {
//         setStatus('User not found in local storage');
//         setTimeout(() => setLoading(false), 3000);
//         return;
//       }

//       try {
//         const response = await EmailLogin(email, (msg) => setStatus(msg));
//         const currentUserData = { email, name: response?.user_name || "User" };
//         setCurrentUser(currentUserData);
//         setStatus(response?.message || 'Auto-login successful!');

//         chrome.storage.local.set({ sabapplier_last_user: currentUserData }, () => {
//           if (chrome.runtime.lastError) {
//             console.error('Failed to save last user:', chrome.runtime.lastError);
//           }
//         });

//         navigate('/dashboard');
//       } catch (err) {
//         setStatus('Auto-login failed: ' + (err.message || 'Unknown error'));
//       }

//       setTimeout(() => setLoading(false), 3000);
//     });
//   };

//   const handleLogout = () => {
//     setCurrentUser(null);

//     if (chrome?.storage?.local) {
//       chrome.storage.local.remove(['sabapplier_last_user'], () => {
//         if (chrome.runtime.lastError) {
//           console.error('Error clearing last user:', chrome.runtime.lastError);
//         }
//       });
//     }

//     navigate('/');
//   };

//   const handleClearAllUsers = () => {
//     if (chrome?.storage?.local) {
//       chrome.storage.local.remove(['sabapplier_users', 'sabapplier_last_user'], () => {
//         if (chrome.runtime.lastError) {
//           console.error('Error clearing all users:', chrome.runtime.lastError);
//         } else {
//           setSavedUsers([]);
//           setCurrentUser(null);
//           navigate('/');
//         }
//       });
//     }
//   };

//   return (
//     <div className='app'>
//       <div className={`container ${loading ? 'blurred' : ''}`}>
//         <Routes>
//           <Route
//             path="/"
//             element={
//               currentUser ? (
//                 <Navigate to="/dashboard" />
//               ) : (
//                 <>
//                   <div className='logo'>
//                     <div className='tag'>
//                       <h1>SabApplier AI</h1>
//                       <p>India's Leading AI Form Filling</p>
//                     </div>
//                   </div>
//                   <AccountDropdown users={savedUsers} onSelect={handleAccountSelect} />
//                   <Login onLogin={handleLogin} />
//                   <a href='https://sabapplier.com/signup' target='_blank' rel='noopener noreferrer'>
//                     Don't Have Account
//                   </a>
//                 </>
//               )
//             }
//           />
//           <Route
//             path="/dashboard"
//             element={
//               currentUser ? (
//                 <Dashboard 
//                   user={currentUser} 
//                   onLogout={handleLogout}
//                   onClearAllUsers={handleClearAllUsers}
//                 />
//               ) : (
//                 <Navigate to="/" />
//               )
//             }
//           />
//         </Routes>
//         {loading && <Loader message={status || currentUser?.name || currentUser?.email} />}
//       </div>
//     </div>
//   );
// }
