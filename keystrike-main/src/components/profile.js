import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { ACHIEVEMENTS, getGuestAchievementData, getGuestGameStats } from '../achievements';
import { auth, db } from '../firebase';
import './profile.css';

function createGuestId() {
  return `guest-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function getStoredGuestId() {
  let guestId = localStorage.getItem('keystrike-guest-player-id');
  if (!guestId) {
    guestId = createGuestId();
    localStorage.setItem('keystrike-guest-player-id', guestId);
  }
  return guestId;
}

function Profile({ onNavigate }) {
  const [user, setUser] = useState(auth.currentUser);
  const [name, setName] = useState(auth.currentUser?.displayName || localStorage.getItem('keystrike-guest-name') || 'Player');
  const [nameDraft, setNameDraft] = useState(name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modeStats, setModeStats] = useState(() => getGuestGameStats());
  const [achievementData, setAchievementData] = useState(() => getGuestAchievementData());
  const [nameMessage, setNameMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [busy, setBusy] = useState(false);
  const guestId = getStoredGuestId();
  const userId = user?.uid;

  useEffect(() => onAuthStateChanged(auth, (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      setName(nextUser.displayName || localStorage.getItem('keystrike-guest-name') || 'Player');
      setNameDraft(nextUser.displayName || localStorage.getItem('keystrike-guest-name') || 'Player');
    } else {
      const guestName = localStorage.getItem('keystrike-guest-name') || 'Player';
      setName(guestName);
      setNameDraft(guestName);
    }
  }), []);

  useEffect(() => {
    if (!userId) {
      setModeStats(getGuestGameStats());
      setAchievementData(getGuestAchievementData());
      return undefined;
    }

    const stopStats = onSnapshot(collection(db, 'users', userId, 'gameStats'), (snapshot) => {
      const records = {};
      snapshot.forEach((entry) => { records[entry.id] = entry.data(); });
      setModeStats(records);
    }, () => setNameError('Could not load saved profile statistics.'));
    const stopAchievements = onSnapshot(doc(db, 'users', userId, 'achievements', 'progress'), (snapshot) => {
      setAchievementData(snapshot.exists() ? snapshot.data() : { progress: {}, unlocked: [] });
    }, () => setNameError('Could not load saved achievements.'));

    return () => {
      stopStats();
      stopAchievements();
    };
  }, [userId]);

  const saveName = async (event) => {
    event.preventDefault();
    const updatedName = nameDraft.trim();
    if (!updatedName) return;

    setNameError('');
    try {
      localStorage.setItem('keystrike-guest-name', updatedName);
      if (user) await updateProfile(user, { displayName: updatedName });
      setName(updatedName);
      setNameMessage('Name updated successfully.');
    } catch {
      setNameError('Could not update your profile name.');
    }
  };

  const connectAccount = async (connectAction) => {
    setBusy(true);
    setAccountError('');
    setAccountMessage('');
    sessionStorage.setItem('keystrike-screen', 'profile');
    try {
      const credential = await connectAction();
      if (nameDraft.trim() && !credential.user.displayName) {
        await updateProfile(credential.user, { displayName: nameDraft.trim() });
        setName(nameDraft.trim());
      }
      setUser(auth.currentUser);
      setAccountMessage('Account connected. Your guest progress is syncing.');
    } catch (connectError) {
      setAccountError(connectError.code === 'auth/invalid-credential'
        ? 'That email or password was not accepted.'
        : connectError.message || 'Could not connect this account.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSignIn = (event) => {
    event.preventDefault();
    connectAccount(() => signInWithEmailAndPassword(auth, email, password));
  };

  const handlePasswordReset = async () => {
    setAccountError('');
    setAccountMessage('');
    if (!email.trim()) {
      setAccountError('Enter your email address first.');
      return;
    }

    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAccountMessage('Password reset instructions have been sent. Check your email.');
    } catch (resetError) {
      setAccountMessage(resetError.code === 'auth/user-not-found'
        ? 'If an account exists for that email, password reset instructions have been sent.'
        : 'Could not send password reset instructions. Check the email and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAccount = () => {
    connectAccount(() => createUserWithEmailAndPassword(auth, email, password));
  };

  const handleGoogleConnect = () => {
    connectAccount(() => signInWithPopup(auth, new GoogleAuthProvider()));
  };

  const handleSignOut = async () => {
    setAccountError('');
    try {
      sessionStorage.setItem('keystrike-screen', 'profile');
      await signOut(auth);
      setAccountMessage('Signed out. Guest play is still available.');
    } catch {
      setAccountError('Could not sign out.');
    }
  };

  const stats = Object.values(modeStats).reduce((totals, entry) => ({
    score: totals.score + (Number(entry.totalScore) || 0),
    notes: totals.notes + (Number(entry.notesPressed) || 0),
    games: totals.games + (Number(entry.gamesPlayed) || 0),
  }), { score: 0, notes: 0, games: 0 });
  const unlocked = new Set(achievementData?.unlocked || []);
  const unlockedCount = ACHIEVEMENTS.filter((achievement) => unlocked.has(achievement.id)).length;

  return (
    <main className="profile-page" style={{ '--music-background': 'url(/assets/glowing-musical-pentagram-background-with-sound-notes_1017-31220.avif)' }}>
      <button className="profile-back" type="button" aria-label="Back to Main Menu" onClick={() => onNavigate('mainmenu')}>
        <img src="/assets/back.png" alt="" />
      </button>
      <header className="profile-header">
        <h1>Player Profile</h1>
        <p>{user ? 'Account connected' : 'Guest profile'}</p>
      </header>

      <section className="profile-content">
        <article className="profile-section profile-identity">
          <h2>Player ID</h2>
          <code>{user?.uid || guestId}</code>
          <form onSubmit={saveName}>
            <label htmlFor="profile-name">Display name</label>
            <div className="profile-name-row">
              <input id="profile-name" value={nameDraft} maxLength={40} onChange={(event) => setNameDraft(event.target.value)} />
              <button type="submit">Save name</button>
            </div>
          </form>
          {nameMessage && <p className="profile-message" role="status">{nameMessage}</p>}
          {nameError && <p className="profile-error" role="alert">{nameError}</p>}
        </article>

        <section className="profile-summary" aria-label="Profile progress">
          <article><span>Total score</span><strong>{stats.score.toLocaleString()}</strong></article>
          <article><span>Notes pressed</span><strong>{stats.notes.toLocaleString()}</strong></article>
          <article><span>Achievements</span><strong>{unlockedCount} / {ACHIEVEMENTS.length}</strong></article>
          <article><span>Completed runs</span><strong>{stats.games.toLocaleString()}</strong></article>
        </section>

        {!user ? (
          <article className="profile-section">
            <h2>Connect account to save progress</h2>
            <p>Your guest progress stays on this device until you connect an account.</p>
            <form className="profile-account-form" onSubmit={handleEmailSignIn}>
              <label htmlFor="profile-email">Email</label>
              <input id="profile-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <label htmlFor="profile-password">Password</label>
              <input id="profile-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button className="profile-reset-password" type="button" disabled={busy} onClick={handlePasswordReset}>Forgot password?</button>
              {accountMessage && <p className="profile-message" role="status">{accountMessage}</p>}
              {accountError && <p className="profile-error" role="alert">{accountError}</p>}
              <div className="profile-account-actions">
                <button type="submit" disabled={busy}>{busy ? 'Connecting...' : 'Sign in with email'}</button>
                <button type="button" disabled={busy || !email || !password} onClick={handleCreateAccount}>Create account</button>
                <button type="button" disabled={busy} onClick={handleGoogleConnect}>Continue with Google</button>
              </div>
            </form>
          </article>
        ) : (
          <article className="profile-section profile-connected">
            <h2>Connected account</h2>
            <p>{user.email || user.displayName || 'Google account'}</p>
            {accountMessage && <p className="profile-message" role="status">{accountMessage}</p>}
            {accountError && <p className="profile-error" role="alert">{accountError}</p>}
            <button type="button" onClick={handleSignOut}>Sign out</button>
          </article>
        )}
      </section>
    </main>
  );
}

export default Profile;