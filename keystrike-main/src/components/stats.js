import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ACHIEVEMENTS, getGuestAchievementData, getGuestGameStats } from '../achievements';
import './stats.css';

const GAME_MODES = [
  { id: 'pianoLesson', label: 'Piano Lesson' },
  { id: 'pianoMan', label: 'Piano Man' },
  { id: 'towerDefense', label: 'Tower Defense' },
];

function Stats({ onNavigate }) {
  const [modeStats, setModeStats] = useState({});
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setModeStats(getGuestGameStats());
      setUnlockedIds(getGuestAchievementData().unlocked);
      setError('Guest progress is stored on this device until you connect an account.');
      setLoading(false);
      return undefined;
    }

    const stopStats = onSnapshot(collection(db, 'users', user.uid, 'gameStats'), (snapshot) => {
      const records = {};
      snapshot.forEach((entry) => { records[entry.id] = entry.data(); });
      setModeStats(records);
      setLoading(false);
      setError('');
    }, () => {
      setError('Could not load account statistics.');
      setLoading(false);
    });
    const stopAchievements = onSnapshot(doc(db, 'users', user.uid, 'achievements', 'progress'), (snapshot) => {
      setUnlockedIds(snapshot.exists() ? snapshot.data().unlocked || [] : []);
    }, () => {
      setError('Could not load account statistics.');
      setLoading(false);
    });

    return () => {
      stopStats();
      stopAchievements();
    };
  }, []);

  const records = Object.values(modeStats);
  const totals = records.reduce((aggregate, stats) => ({
    score: aggregate.score + (Number(stats.totalScore) || 0),
    bestScore: Math.max(aggregate.bestScore, Number(stats.bestScore) || 0),
    notesPressed: aggregate.notesPressed + (Number(stats.notesPressed) || 0),
    gamesPlayed: aggregate.gamesPlayed + (Number(stats.gamesPlayed) || 0),
  }), { score: 0, bestScore: 0, notesPressed: 0, gamesPlayed: 0 });
  const unlockedCount = ACHIEVEMENTS.filter((achievement) => unlockedIds.includes(achievement.id)).length;

  return (
    <main className="stats-page" style={{ '--music-background': 'url(/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif)' }}>
      <button className="stats-back" type="button" aria-label="Back to Main Menu" onClick={() => onNavigate('mainmenu')}>
        <img src="/assets/back.png" alt="" />
      </button>
      <header className="stats-header">
        <h1>Account Stats</h1>
        <p>Your progress across every game mode</p>
      </header>

      {loading && <p className="stats-message" role="status">Loading statistics...</p>}
      {error && (
        <div className="stats-message" role="alert">
          <p>{error}</p>
          {!auth.currentUser && <button type="button" onClick={() => onNavigate('profile')}>Connect account to sync progress</button>}
        </div>
      )}

      <section className="stats-summary" aria-label="Account totals">
        <article><span>Total score</span><strong>{totals.score.toLocaleString()}</strong></article>
        <article><span>Best run</span><strong>{totals.bestScore.toLocaleString()}</strong></article>
        <article><span>Notes pressed</span><strong>{totals.notesPressed.toLocaleString()}</strong></article>
        <article><span>Achievements</span><strong>{unlockedCount} / {ACHIEVEMENTS.length}</strong></article>
      </section>

      <section className="stats-modes" aria-labelledby="stats-modes-title">
        <h2 id="stats-modes-title">Game Modes</h2>
        {GAME_MODES.map((mode) => {
          const stats = modeStats[mode.id] || {};
          return (
            <article className="stats-mode" key={mode.id}>
              <h3>{mode.label}</h3>
              <dl>
                <div><dt>Runs</dt><dd>{Number(stats.gamesPlayed) || 0}</dd></div>
                <div><dt>Total score</dt><dd>{(Number(stats.totalScore) || 0).toLocaleString()}</dd></div>
                <div><dt>Best score</dt><dd>{(Number(stats.bestScore) || 0).toLocaleString()}</dd></div>
                <div><dt>Notes pressed</dt><dd>{(Number(stats.notesPressed) || 0).toLocaleString()}</dd></div>
              </dl>
            </article>
          );
        })}
      </section>
      <p className="stats-runs">Completed runs: {totals.gamesPlayed.toLocaleString()}</p>
    </main>
  );
}

export default Stats;