import React from 'react';
import { queueGameResultForSaving } from '../achievements';
import './accountsaveprompt.css';

function AccountSavePrompt({ mode, result, onNavigate, onDismiss }) {
  const saveWithAccount = (screen) => {
    queueGameResultForSaving(mode, result);
    onNavigate(screen);
  };

  return (
    <div className="account-save-overlay">
      <section className="account-save-dialog" role="dialog" aria-modal="true" aria-labelledby="account-save-title">
        <h2 id="account-save-title">Save your progress?</h2>
        <p>Create an account or sign in to keep this score, your history, and achievements.</p>
        <button type="button" autoFocus onClick={() => saveWithAccount('login')}>Sign in</button>
        <button type="button" onClick={() => saveWithAccount('signup')}>Create account</button>
        <button type="button" className="account-save-guest" onClick={onDismiss}>Continue without saving</button>
      </section>
    </div>
  );
}

export default AccountSavePrompt;