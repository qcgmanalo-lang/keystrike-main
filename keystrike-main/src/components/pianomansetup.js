import React, { useState } from 'react';
import './PianoManSetup.css';


function PianoManSetup({
  songs,
  difficulty,
  setDifficulty,
  selected,
  setSelected,
  onStart,
}) {
  const [tab, setTab] = useState('difficulty');


  return (
    <div className="pianoman-setup">


      <div className="pianoman-tabs">


        <button
          type="button"
          className={tab === 'difficulty' ? 'active' : ''}
          onClick={() => setTab('difficulty')}
        >
          Difficulty
        </button>


        <button
          type="button"
          className={tab === 'songs' ? 'active' : ''}
          onClick={() => setTab('songs')}
        >
          Songs
        </button>


      </div>




      {tab === 'difficulty' && (
        <div className="difficulty-tab">


          <h1>Difficulty</h1>


          <button
            type="button"
            className={`easy ${difficulty === 'easy' ? 'selected' : ''}`}
            onClick={() => setDifficulty('easy')}
          >
            Easy
          </button>


          <button
            type="button"
            className={`medium ${difficulty === 'normal' ? 'selected' : ''}`}
            onClick={() => setDifficulty('normal')}
          >
            Medium
          </button>


          <button
            type="button"
            className={`hard ${difficulty === 'hard' ? 'selected' : ''}`}
            onClick={() => setDifficulty('hard')}
          >
            Hard
          </button>


        </div>
      )}




      {tab === 'songs' && (
        <div className="songs-tab">


          <h1>Choose Song</h1>


          {songs.map((song) => (
            <button
              type="button"
              key={song.title}
              className={
                selected === song.title
                  ? 'song selected'
                  : 'song'
              }
              onClick={() => setSelected(song.title)}
            >
              {song.title}
            </button>
          ))}


        </div>
      )}




      <div className="selected-info">
        <p>
          Song: <strong>{selected || 'None selected'}</strong>
        </p>


        <p>
          Difficulty:{' '}
          <strong>
            {difficulty === 'normal'
              ? 'Medium'
              : difficulty.charAt(0).toUpperCase() +
                difficulty.slice(1)}
          </strong>
        </p>
      </div>




      <button
        type="button"
        className="start-button"
        disabled={!selected}
        onClick={onStart}
      >
        Start Game
      </button>


    </div>
  );
}


export default PianoManSetup;


