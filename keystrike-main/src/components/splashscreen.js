import React from 'react';
import './splashscreen.css';

function SplashScreen({ onNavigate }) {
  return <div className="splashscreen-page" style={{ '--music-background': 'url(/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif)' }}>
    <div className="container"><img src="/assets/splashscreen.png" alt="splashscreen" className="splashscreen" />
    <div className="button"><button className="start"><a href="mainmenu.html" onClick={(event) => { event.preventDefault(); onNavigate('mainmenu'); }}>Start!</a></button></div></div></div>;
}

export default SplashScreen;
