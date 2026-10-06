import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function Settings({ onNavigate }) {
  const handleSignOut = async () => {
    await signOut(auth);
    sessionStorage.setItem('keystrike-screen', 'splash');
    onNavigate('splash');
  };

  return <main><button className="back" onClick={() => onNavigate('mainmenu')}><img src="/assets/back.png" alt="back" /></button><h1>Settings</h1><label><input type="checkbox" defaultChecked /> Sound effects</label><label>
    <input type="checkbox" defaultChecked /> 
  Music</label><button onClick={handleSignOut}>Sign Out</button></main>;
}

export default Settings;
