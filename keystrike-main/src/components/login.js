import React from 'react';
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { getAuthReturnScreen } from '../achievements';
import './login.css';

function Login({ onNavigate }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [resetStatus, setResetStatus] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const preventNavigation = (event, screen) => { event.preventDefault(); onNavigate(screen); };
  const finishLogin = async (loginAction) => {
    setError('');
    setLoading(true);
    try {
      await loginAction();
      onNavigate(getAuthReturnScreen());
    } catch (loginError) {
      setError(loginError.code === 'auth/invalid-credential' ? 'The email or password is incorrect.' : loginError.message);
    } finally {
      setLoading(false);
    }
  };
  const handleEmailLogin = (event) => {
    event.preventDefault();
    finishLogin(() => signInWithEmailAndPassword(auth, email, password));
  };
  const handleGoogleLogin = (event) => {
    event.preventDefault();
    finishLogin(() => signInWithPopup(auth, new GoogleAuthProvider()));
  };
  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setError('');
    setResetStatus('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetStatus('Password reset instructions have been sent. Check your email.');
    } catch (resetError) {
      setResetStatus(resetError.code === 'auth/user-not-found'
        ? 'If an account exists for that email, password reset instructions have been sent.'
        : 'Could not send password reset instructions. Check the email and try again.');
    } finally {
      setLoading(false);
    }
  };
  return <div className="login-page"><div className="container">
    <a href="splashscreen.html" onClick={(event) => preventNavigation(event, 'splash')}><img src="/assets/backblue.png" alt="back" className="back" /></a>
    <div className="content">
      <h1 className="Musician">Welcome Musician!</h1><h2 className="Log">Log in to your account.</h2>
      <input type="email" id="email" name="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} /><br />
      <input type="password" id="password" name="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <div className="forgot"><button type="button" onClick={handlePasswordReset} disabled={loading}>Forgot Password?</button></div>
      {resetStatus && <p className="reset-status" role="status">{resetStatus}</p>}
      <button className="login" onClick={handleEmailLogin} disabled={loading}><a href="mainmenu.html" onClick={(event) => event.preventDefault()}>{loading ? 'Logging In...' : 'Log In'}</a></button><br />
      <p>-------------- Or --------------</p><button className="Google" onClick={handleGoogleLogin} disabled={loading}><a href="#google-login" onClick={(event) => event.preventDefault()}>Continue with Google</a></button><br />
      {error && <p role="alert">{error}</p>}
      <div className="redirect"><p className="alre">Don't have an account?</p><p className="lg"><a href="signup.html" onClick={(event) => preventNavigation(event, 'signup')}>Sign up.</a></p></div>
    </div>
  </div></div>;
}

export default Login;
