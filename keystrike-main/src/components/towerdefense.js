import { useEffect, useReducer, useRef, useState } from 'react';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import AccountSavePrompt from './AccountSavePrompt';
import Base from './TowerDefenseCompo/Battlefield/Base';
import Mobs from './TowerDefenseCompo/Battlefield/Mobs';
import HPbar from './TowerDefenseCompo/HPbar';
import NoteTrack from './TowerDefenseCompo/NoteTrack';
import Tier from './TowerDefenseCompo/Tier';
import Keyboard from './TowerDefenseCompo/Keyboard';
import './towerdefense.css';

const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const maxHp = 100;
const spawnDelay = 1500;
const travelDuration = 6500;

function makeWave(tier) {
  const count = 4 + tier;
  return Array.from({ length: count }, (_, index) => ({
    id: `${tier}-${index}`,
    note: notes[Math.floor(Math.random() * notes.length)],
    monster: ((index + tier - 1) % 5) + 1,
  }));
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'spawn':
      if (!state.queue.length || state.hp <= 0 || state.paused) return state;
      return {
        ...state,
        queue: state.queue.slice(1),
        mobs: [...state.mobs, state.queue[0]],
      };
    case 'hit':
      if (state.paused || !state.mobs.some((mob) => mob.id === action.id)) return state;
      return {
        ...state,
        mobs: state.mobs.filter((mob) => mob.id !== action.id),
        score: state.score + 100,
      };
    case 'press':
      if (state.paused || state.hp <= 0) return state;
      return { ...state, notesPressed: state.notesPressed + 1 };
    case 'leak':
      if (state.paused || !state.mobs.some((mob) => mob.id === action.id)) return state;
      return {
        ...state,
        hp: Math.max(0, state.hp - 10),
        mobs: state.mobs.filter((mob) => mob.id !== action.id),
      };
    case 'next-wave':
      if (state.paused || state.hp <= 0 || state.queue.length || state.mobs.length) return state;
      return { ...state, tier: state.tier + 1, queue: makeWave(state.tier + 1) };
    case 'toggle-pause':
      if (state.hp <= 0) return state;
      return { ...state, paused: !state.paused };
    case 'restart':
      return { tier: 1, hp: maxHp, queue: makeWave(1), mobs: [], paused: false, score: 0, notesPressed: 0 };
    default:
      return state;
  }
}

const initialGame = { tier: 1, hp: maxHp, queue: makeWave(1), mobs: [], paused: false, score: 0, notesPressed: 0 };

function TowerDefense({ onNavigate }) {
  const [game, dispatch] = useReducer(gameReducer, initialGame);
  const [scoreSaveStatus, setScoreSaveStatus] = useState('');
  const [savePromptResult, setSavePromptResult] = useState(null);
  const scoreSaveStarted = useRef(false);
  const defeated = game.hp <= 0;

  useEffect(() => {
    if (!game.queue.length || defeated || game.paused) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'spawn' }), spawnDelay);
    return () => window.clearTimeout(timer);
  }, [game.queue, defeated, game.paused]);

  useEffect(() => {
    if (game.queue.length || game.mobs.length || defeated || game.paused) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'next-wave' }), 1800);
    return () => window.clearTimeout(timer);
  }, [game.queue.length, game.mobs.length, defeated, game.paused]);

  useEffect(() => {
    if (!defeated) {
      scoreSaveStarted.current = false;
      setScoreSaveStatus('');
      return;
    }
    if (scoreSaveStarted.current) return;

    scoreSaveStarted.current = true;
    const result = { score: game.score, notesPressed: game.notesPressed, highestTier: game.tier };
    if (!auth.currentUser) {
      setScoreSaveStatus('');
      const guestResultId = recordGuestGameResult('towerDefense', result);
      setSavePromptResult({ ...result, guestResultId });
      return;
    }

    setScoreSaveStatus('Saving score...');
    recordGameResult('towerDefense', result).then(() => {
      setScoreSaveStatus('Score saved to your account.');
    }).catch((error) => {
      console.error('Could not save Tower Defense score.', error);
      setScoreSaveStatus('Score could not be saved.');
    });
  }, [defeated, game.notesPressed, game.score, game.tier]);

  const playNote = (note) => {
    if (game.paused || defeated) return;
    dispatch({ type: 'press' });
    const target = game.mobs[0];
    if (target?.note === note) dispatch({ type: 'hit', id: target.id });
  };

  const targetNote = game.mobs[0]?.note;

  return (
    <main className={`game-container${game.paused ? ' is-paused' : ''}`} style={{ '--tower-defense-background': 'url(/bg.jpg)' }}>
      <button className="tower-defense-back" type="button" aria-label="Back to minigames" onClick={() => onNavigate('minigame')}>
        <img src="/assets/back.png" alt="" />
      </button>
      <button
        className="tower-defense-pause"
        type="button"
        aria-label={game.paused ? 'Resume game' : 'Pause game'}
        onClick={() => dispatch({ type: 'toggle-pause' })}
      >
        {game.paused ? 'Resume' : 'Pause'}
      </button>
      <div className="game-hud">
        <HPbar hp={game.hp} maxHp={maxHp} />
        <Tier tier={game.tier} mobs={game.queue.length + game.mobs.length} />
        <Mobs active={game.mobs.length} waiting={game.queue.length} />
      </div>
      <div className="game-score" aria-live="polite">Score {game.score}</div>
      <NoteTrack mobs={game.mobs} travelDuration={travelDuration} onLeak={(id) => dispatch({ type: 'leak', id })} />
      <Base />
      {defeated && (
        <div className="game-over" role="alert">
          <strong>The castle has fallen</strong>
          <span>{scoreSaveStatus}</span>
          <button type="button" onClick={() => { setSavePromptResult(null); dispatch({ type: 'restart' }); }}>Play again</button>
        </div>
      )}
      {game.paused && !defeated && (
        <div className="game-paused">
          <section className="game-paused-dialog" role="dialog" aria-modal="true" aria-labelledby="tower-defense-paused-title">
            <h2 id="tower-defense-paused-title">Paused</h2>
            <button type="button" autoFocus onClick={() => dispatch({ type: 'toggle-pause' })}>Resume</button>
            <button type="button" onClick={() => dispatch({ type: 'restart' })}>Retry</button>
            <button type="button" onClick={() => onNavigate('minigame')}>Return to menu</button>
          </section>
        </div>
      )}
      {savePromptResult && (
        <AccountSavePrompt
          mode="towerDefense"
          result={savePromptResult}
          onNavigate={onNavigate}
          onDismiss={() => setSavePromptResult(null)}
        />
      )}
      <Keyboard ilawNote={targetNote} Press={playNote} paused={game.paused} />
    </main>
  );
}

export default TowerDefense;
