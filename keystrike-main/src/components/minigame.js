import React from 'react';
import './minigame.css';

function GameCard({ title, onClick }) {
  return <div className="container"><img src="/assets/wireframe.png" alt="wireframe" className="wireframe" /><div className="divtext"><p className="text">{title}</p><p className="tddescription">Play a game</p><button className="tdbutton"><a href={`${title.toLowerCase().replace(' ', '')}.html`} onClick={(event) => { event.preventDefault(); onClick(); }}>Play</a></button></div></div>;
}

function Minigame({ onNavigate }) {
  return <div className="minigame-page">
    <a href="mainmenu.html">
      <img src="/assets/back.png" alt="back" className="back" onClick={(event) => { event.preventDefault(); onNavigate('mainmenu'); }} /></a><h1 className="welcome">Welcome to the Minigame!</h1>
      <p className="description">Get ready to test your skills and have fun!</p>
      <GameCard title="Tower Defense" onClick={() => onNavigate('towerdefense')} /><br /><br />
      <GameCard title="Piano Man" onClick={() => onNavigate('pianoman')} /></div>;
}

export default Minigame;
