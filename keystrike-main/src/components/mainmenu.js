import React from 'react';
import './mainmenu.css';

function MainMenu({ onNavigate }) {
  const preventNavigation = (event, screen) => { event.preventDefault(); onNavigate(screen); };
  return <div className="mainmenu-page" style={{
    '--piano-image': 'url(/assets/piano.png)', '--achievements-image': 'url(/assets/achievements.png)',
    '--settings-image': 'url(/assets/settings.png)', '--music-background':
      'url(/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif)'
  }}>
    <a href="splashscreen.html" onClick={(event) => preventNavigation(event, 'splash')}>
      <img src="/assets/back.png" alt="back" className="back" />
    </a><h1 className="mainmenu">Main Menu</h1><button className="playmenu">
      <a href="playmenu.html" onClick={(event) => preventNavigation(event, 'playmenu')}>Play</a></button>
    <br /><button className="stats"><a href="stats.html" onClick={(event) => preventNavigation(event, 'stats')}>Stats</a>
    </button><br />
    <button className="settings"><a href="settings.html" onClick={(event) => preventNavigation(event, 'settings')}>Settings</a></button><br />
    <button className="profile"><a href="profile.html" onClick={(event) => preventNavigation(event, 'profile')}>Profile</a></button><br /></div>;
}

export default MainMenu;
