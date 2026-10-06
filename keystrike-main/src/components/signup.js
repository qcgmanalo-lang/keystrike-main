import React from 'react';
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { getAuthReturnScreen } from '../achievements';
import './signup.css';

function Signup({ onNavigate }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const preventNavigation = (event, screen) => { event.preventDefault(); onNavigate(screen); };
  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      onNavigate(getAuthReturnScreen());
    } catch (signupError) {
      setError(signupError.code === 'auth/email-already-in-use' ? 'An account already exists for this email.' : signupError.message);
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleSignup = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onNavigate(getAuthReturnScreen());
    } catch (signupError) {
      setError(signupError.message);
    } finally {
      setLoading(false);
    }
  };
  return <div className="signup-page"><div className="container">
    <a href="mainmenu.html" onClick={(event) => preventNavigation(event, 'mainmenu')}><img src="/assets/backblue.png" alt="back" className="back" /></a>
    <div className="content"><h1 className="Musician">Welcome, Musician!</h1><h2 className="Log">Start your musical journey!</h2>
      <input type="text" id="username" name="username" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <br /><input type="email" id="email" name="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <br /><input type="password" id="password" name="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <div className="forgot"><a href="#forgot-password">Forgot Password?</a></div><button className="signup" onClick={handleSignup} disabled={loading}>
        <a href="mainmenu.html" onClick={(event) => event.preventDefault()}>{loading ? 'Signing Up...' : 'Sign Up'}</a></button><br />
      <p>-------------- Or --------------</p><button className="Google" onClick={handleGoogleSignup} disabled={loading}>
        <a href="#google-signup" onClick={(event) => event.preventDefault()}>Continue with Google</a>
      </button><br />
      {error && <p role="alert">{error}</p>}
      <div className="redirect"><p className="alre">Already have an account?</p><p className="lg">
        <a href="login.html" onClick={(event) => preventNavigation(event, 'login')}>Log in.</a></p></div>
    </div>
  </div></div>;
}

export default Signup;
