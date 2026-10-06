import React from 'react';
import './playmenu.css';

function PlayMenu({ onNavigate }) {
  const preventNavigation = (event, screen) => { event.preventDefault(); onNavigate(screen); };
  return <div className="playmenu-page" style={{
    '--music-background': 'url(/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif)',
    '--piano-image': 'url(/assets/piano.png)',
    '--achievements-image': 'url(/assets/achievements.png)',
    '--minigame-image': 'url(/assets/wireframe.png)',
  }}>
    <a href="mainmenu.html" onClick={(event) => preventNavigation(event, 'mainmenu')}>
      <img src="/assets/back.png" alt="back" className="back" /></a>
    <h1 className="pm">Play Menu</h1><div className="top-buttons"><button className="msclesson">
      <a href="musiclesson.html" onClick={(event) => preventNavigation(event, 'musiclesson')}>Music Lesson</a></button>
      <button className="goal"><a href="goal.html" onClick={(event) => preventNavigation(event, 'goal')}>Goal</a>
      </button>
      </div><button className="minigame">
      <a href="minigame.html" onClick={(event) => preventNavigation(event, 'minigame')}>MINIGAME</a></button><br /></div>;
}

export default PlayMenu;
