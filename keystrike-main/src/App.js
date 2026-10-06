import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { flushPendingGameResults } from './achievements';
import SplashScreen from './components/splashscreen';
import Login from './components/login';
import Signup from './components/signup';
import MainMenu from './components/mainmenu';
import PlayMenu from './components/playmenu';
import Settings from './components/settings';
import Minigame from './components/minigame';
import Goal from './components/goal';
import Stats from './components/stats';
import Profile from './components/profile';
import MusicLesson from './components/musiclesson';
import PianoMan from './components/pianoman';
import TowerDefense from './components/towerdefense';
import Keyboard from './components/Keyboard';
import Keynote from './components/Keynote';

function App() {

  const [screen, setScreen] = useState(() => sessionStorage.getItem('keystrike-screen') || 'splash');
  const [authReady, setAuthReady] = useState(false);
  const navigate = (nextScreen) => {
    sessionStorage.setItem('keystrike-screen', nextScreen);
    setScreen(nextScreen);
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const requestedReturn = sessionStorage.getItem('keystrike-auth-return-screen');
        const savedScreen = sessionStorage.getItem('keystrike-screen');
        const destination = requestedReturn || (savedScreen === 'login' || savedScreen === 'signup' ? 'mainmenu' : savedScreen || 'mainmenu');
        sessionStorage.setItem('keystrike-screen', destination);
        setScreen(destination);
        flushPendingGameResults().catch((error) => console.error('Could not save pending game results.', error));
      } else {
        const savedScreen = sessionStorage.getItem('keystrike-screen');
        const guestScreen = savedScreen === 'login' || savedScreen === 'signup' ? 'splash' : savedScreen || 'splash';
        sessionStorage.setItem('keystrike-screen', guestScreen);
        setScreen(guestScreen);
      }
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  if (!authReady) return null;

  switch (screen) {
    case 'login': return <Login onNavigate={navigate} />;
    case 'signup': return <Signup onNavigate={navigate} />;
    case 'mainmenu': return <MainMenu onNavigate={navigate} />;
    case 'playmenu': return <PlayMenu onNavigate={navigate} />;
    case 'settings': return <Settings onNavigate={navigate} />;
    case 'minigame': return <Minigame onNavigate={navigate} />;
    case 'goal': return <Goal onNavigate={navigate} />;
    case 'stats': return <Stats onNavigate={navigate} />;
    case 'profile': return <Profile onNavigate={navigate} />;
    case 'musiclesson': return <MusicLesson onNavigate={navigate} />;
    case 'pianoman': return <PianoMan onNavigate={navigate} />;
    case 'towerdefense': return <TowerDefense onNavigate={navigate} />;
    default: return <SplashScreen onNavigate={navigate} />;
  }
}

export default App;
