import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ACHIEVEMENTS, getAchievementProgress, getGuestAchievementData } from '../achievements';
import './goal.css';

function Goal({ onNavigate }) {
  const [achievementData, setAchievementData] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setAchievementData(getGuestAchievementData());
      setLoadError('Guest achievements are stored on this device until you connect an account.');
      return undefined;
    }

    return onSnapshot(doc(db, 'users', user.uid, 'achievements', 'progress'), (snapshot) => {
      setAchievementData(snapshot.exists() ? snapshot.data() : { progress: {}, unlocked: [] });
      setLoadError('');
    }, () => {
      setLoadError('Could not load achievements.');
    });
  }, []);

  const progress = achievementData?.progress || {};
  const unlocked = new Set(achievementData?.unlocked || []);
  const unlockedCount = ACHIEVEMENTS.filter((achievement) => unlocked.has(achievement.id)).length;

  return (
    <main className="goal-page" style={{ '--music-background': 'url(/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif)' }}>
      <button className="goal-back" type="button" aria-label="Back to Play Menu" onClick={() => onNavigate('playmenu')}>
        <img src="/assets/back.png" alt="" />
      </button>
      <header className="goal-header">
        <h1>Achievements</h1>
        <p>{unlockedCount} of {ACHIEVEMENTS.length} unlocked</p>
      </header>
      {loadError && <p className="goal-message" role="status">{loadError}</p>}
      {loadError && !auth.currentUser && <button type="button" onClick={() => onNavigate('profile')}>Connect account to sync achievements</button>}
      {!loadError && !achievementData && <p className="goal-message" role="status">Loading achievements...</p>}
      <section className="achievement-list" aria-label="Your achievements">
        {ACHIEVEMENTS.map((achievement) => {
          const current = getAchievementProgress(achievement.id, progress);
          const complete = unlocked.has(achievement.id);
          const percentage = Math.min(100, (current / achievement.target) * 100);
          return (
            <article className={`achievement${complete ? ' is-unlocked' : ''}`} key={achievement.id}>
              <div className="achievement-copy">
                <h2>{achievement.title}</h2>
                <p>{achievement.description}</p>
              </div>
              <div className="achievement-status">
                <span>{complete ? 'Unlocked' : `${Math.min(current, achievement.target)} / ${achievement.target}`}</span>
                <div className="achievement-track" role="progressbar" aria-label={`${achievement.title} progress`} aria-valuemin="0" aria-valuemax={achievement.target} aria-valuenow={Math.min(current, achievement.target)}>
                  <span style={{ width: `${percentage}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default Goal;
