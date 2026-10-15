import React, { useRef, useState, useEffect } from 'react';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import './pianoman.css';
import Keyboard from './Keyboard.js';
import AccountSavePrompt from './AccountSavePrompt';
import ResultsScreen from './ResultsScreen';
import { POINTS, JUDGE_WINDOWS, judge, calcAccuracy } from './judgement';


const SONGS = [
  {
    title: 'Twinkle Twinkle Little Star',
    bpm: 100,
    notes:
      'C C G G A A G:2 F F E E D D C:2 G G F F E E D:2 G G F F E E D:2 C C G G A A G:2 F F E E D D C:2',
  },
  {
    title: 'Ode to Joy',
    bpm: 100,
    notes: 'E E F G G F E D C C D E E D D:2 E E F G G F E D C C D E D C C:2',
  },
  {
    title: 'Mary Had a Little Lamb',
    bpm: 100,
    notes: 'E D C D E E E:2 D D D:2 E G G:2 E D C D E E E E D D E D C:4',
  },
  {
    title: 'Hot Cross Buns',
    bpm: 100,
    notes: 'E D C:2 E D C:2 C C C C D D D D E D C:2',
  },
  {
    title: 'Frere Jacques',
    bpm: 100,
    notes:
      'C D E C C D E C E F G:2 E F G:2 G A G F E C G A G F E C C G C:2 C G C:2',
  },
];


const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];


const FREQ = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
  A: 440.0,
  B: 493.88,
};


const PRE = 1; // seconds before the first note


const DIFFICULTY = {
  easy: { gap: 0.8, perSec: 1.2 },
  normal: { gap: 0.55, perSec: 2 },
  hard: { gap: 0.45, perSec: 3 },
};


const MIN_SCORE = 1.3;
const CONTINUITY = 0.15;
const PITCH_WINDOW = 4096;
const FRAME = 1024;
const HOP = 512;


// Chromatic semitone index -> white key index (null = black key)
const WHITE_IDX = [0, null, 1, null, 2, 3, null, 4, null, 5, null, 6];


/* ---------- Melody (for built-in songs) ---------- */


function buildMelody(str, bpm) {
  const beat = 60 / bpm;
  let t = 0;
  const out = [];


  str.trim().split(/\s+/).forEach((tok) => {
    const [note, len = '1'] = tok.split(':');
    const dur = parseFloat(len) * beat;
    if (note !== '-') out.push({ note, t, dur });
    t += dur;
  });


  return out;
}


/* ---------- DSP helpers ---------- */


function fft(re, im) {
  const n = re.length;


  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;


    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }


  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;


    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;


      for (let j = 0; j < half; j++) {
        const a = i + j;
        const b = a + half;
        const vr = re[b] * cr - im[b] * ci;
        const vi = re[b] * ci + im[b] * cr;


        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;


        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}


function toMono(buffer) {
  const channels = buffer.numberOfChannels;
  const out = new Float32Array(buffer.length);


  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += data[i] / channels;
  }


  return out;
}


function makeHann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  }
  return w;
}


// Spectral flux: how much the spectrum increases from frame to frame
function onsetEnvelope(data, sr) {
  const hann = makeHann(FRAME);
  const bins = Math.min(FRAME / 2, Math.floor(8000 / (sr / FRAME)));
  const re = new Float32Array(FRAME);
  const im = new Float32Array(FRAME);
  const prev = new Float32Array(bins);
  const flux = [];


  for (let start = 0; start + FRAME < data.length; start += HOP) {
    for (let i = 0; i < FRAME; i++) {
      re[i] = data[start + i] * hann[i];
      im[i] = 0;
    }


    fft(re, im);


    let f = 0;
    for (let k = 1; k < bins; k++) {
      const m = Math.log1p(Math.hypot(re[k], im[k]));
      f += Math.max(0, m - prev[k]);
      prev[k] = m;
    }


    flux.push(f);
  }


  return flux;
}


// Energy of a single frequency in a window
function goertzel(data, start, n, freq, sr, hann) {
  const k = 2 * Math.cos((2 * Math.PI * freq) / sr);
  let s1 = 0;
  let s2 = 0;


  for (let i = 0; i < n; i++) {
    const s0 = data[start + i] * hann[i] + k * s1 - s2;
    s2 = s1;
    s1 = s0;
  }


  return Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2);
}


/* ---------- Pitch detection ---------- */


function detectNote(data, sr, time, history, hann) {
  const last = history.length ? history[history.length - 1] : 'C';
  const start = Math.floor((time + 0.02) * sr);


  if (start + PITCH_WINDOW >= data.length) return last;


  // 12-bin chroma summed over three octaves
  const chroma = new Array(12).fill(0);
  for (let s = 0; s < 12; s++) {
    [0.5, 1, 2].forEach((oct) => {
      const f = FREQ.C * Math.pow(2, s / 12) * oct;
      chroma[s] += Math.sqrt(goertzel(data, start, PITCH_WINDOW, f, sr, hann));
    });
  }


  // Fold chroma into the 7 white keys (black keys split between neighbours)
  const white = new Array(7).fill(0);
  for (let s = 0; s < 12; s++) {
    if (WHITE_IDX[s] !== null) {
      white[WHITE_IDX[s]] += chroma[s];
    } else {
      white[WHITE_IDX[s - 1]] += chroma[s] / 2;
      white[WHITE_IDX[s + 1]] += chroma[s] / 2;
    }
  }


  // Favour notes close to the previous one
  const prevIdx = history.length ? NOTES.indexOf(last) : -1;
  const scored = white
    .map((v, i) => ({
      i,
      v: v * (prevIdx >= 0 && Math.abs(i - prevIdx) <= 1 ? 1 + CONTINUITY : 1),
    }))
    .sort((a, b) => b.v - a.v);


  let pick = scored[0].i;


  // Avoid three identical notes in a row
  const n = history.length;
  if (n >= 2 && history[n - 1] === NOTES[pick] && history[n - 2] === NOTES[pick]) {
    pick = scored[1].i;
  }


  return NOTES[pick];
}


/* ---------- Song analysis ---------- */


function analyzeSong(buffer, level) {
  const { gap, perSec } = DIFFICULTY[level];
  const data = toMono(buffer);
  const sr = buffer.sampleRate;
  const duration = buffer.duration;


  const flux = onsetEnvelope(data, sr);
  const n = flux.length;


  // Prefix sums for fast moving averages
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + flux[i];


  const W = Math.round((0.6 * sr) / HOP);
  const candidates = [];


  for (let i = 3; i < n - 3; i++) {
    // local peak?
    let isPeak = true;
    for (let k = -3; k <= 3; k++) {
      if (k !== 0 && flux[i + k] > flux[i]) {
        isPeak = false;
        break;
      }
    }
    if (!isPeak) continue;


    const a = Math.max(0, i - W);
    const b = Math.min(n, i + W);
    const mean = (prefix[b] - prefix[a]) / (b - a);
    const score = flux[i] / (mean + 1e-6);
    if (score < MIN_SCORE) continue;


    const t = (i * HOP + FRAME * 0.6) / sr;
    if (t < 0.5 || t > duration - 1) continue;


    candidates.push({ t, score });
  }


  candidates.sort((a, b) => b.score - a.score);


  // Greedily keep the strongest onsets that are far enough apart
  const target = Math.max(1, Math.round(duration * perSec));
  const picked = [];


  for (const c of candidates) {
    if (picked.length >= target) break;
    if (picked.every((p) => Math.abs(p.t - c.t) >= gap)) picked.push(c);
  }


  picked.sort((a, b) => a.t - b.t);


  const hann = makeHann(PITCH_WINDOW);
  const history = [];


  return picked.map((p) => {
    const note = detectNote(data, sr, p.t, history, hann);
    history.push(note);
    return { note, delay: PRE + p.t };
  });
}


/* ---------- Game config ---------- */


const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', className: 'easy' },
  { key: 'normal', label: 'Medium', className: 'medium' },
  { key: 'hard', label: 'Hard', className: 'hard' },
];


const TEMPO = { easy: 0.8, normal: 1, hard: 1.2 };


const ANIM_DURATION = 5;
const HIT_OFFSET = ANIM_DURATION * (0.1 + (0.9 * (320 - 64)) / 360);
const NOTE_SPEED = 360 / (ANIM_DURATION * 0.9);
const SYNC_OFFSET = 0;


const EMPTY_STATS = { great: 0, ok: 0, meh: 0, miss: 0 };


const calcScore = (s) =>
  s.great * POINTS.great + s.ok * POINTS.ok + s.meh * POINTS.meh;


const difficultyLabel = (key) =>
  DIFFICULTIES.find((d) => d.key === key)?.label ?? key;


const centerX = (el) => {
  const r = el.getBoundingClientRect();
  return r.left + r.width / 2;
};


function PianoMan({ onNavigate }) {
  /* ---------- State ---------- */
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('Select a song to start');
  const [song, setSong] = useState([]);
  const [songId, setSongId] = useState(0);
  const [difficulty, setDifficulty] = useState('normal');
  const [selected, setSelected] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [savePromptResult, setSavePromptResult] = useState(null);
  const [results, setResults] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [setupTab, setSetupTab] = useState('difficulty');


  /* ---------- Refs ---------- */
  const lineRef = useRef(null);
  const noteRefs = useRef({});
  const processedNotes = useRef(new Set());
  const completedNotesRef = useRef(new Set());
  const notesPressedRef = useRef(0);
  const songResultSavedRef = useRef(false);
  const statsRef = useRef({ ...EMPTY_STATS });
  const comboRef = useRef({ current: 0, max: 0 });
  const levelRef = useRef('normal');


  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const masterRef = useRef(null);
  const bufferRef = useRef(null);
  const eventsRef = useRef([]);
  const cacheRef = useRef({});
  const currentRef = useRef(null);
  const busyRef = useRef(false);
  const pausedRef = useRef(false);


  /* ---------- Audio ---------- */
  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };


  const stopSong = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }


    if (masterRef.current) {
      masterRef.current.disconnect();
      masterRef.current = null;
    }
  };


  const playTone = (note, when, dur = 0.35, vol = 0.12, dest) => {
    const ctx = getCtx();
    const t0 = when === undefined ? ctx.currentTime : when;
    const length = Math.max(dur, 0.1);


    const osc = ctx.createOscillator();
    const gain = ctx.createGain();


    osc.type = 'triangle';
    osc.frequency.value = FREQ[note];


    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);


    osc.connect(gain).connect(dest || ctx.destination);
    osc.start(t0);
    osc.stop(t0 + length + 0.05);
  };


  /* ---------- Game logic ---------- */
  const registerJudgment = (type) => {
    const stats = statsRef.current;
    const combo = comboRef.current;


    stats[type] += 1;


    if (type === 'miss') {
      combo.current = 0;
    } else {
      combo.current += 1;
      combo.max = Math.max(combo.max, combo.current);
    }


    setScore(calcScore(stats));
  };


  // Returns [{ note, delay }] for a song entry (built-in melody or audio file)
  const buildNotes = async (entry, level) => {
    if (entry.notes) {
      const events = buildMelody(entry.notes, entry.bpm * TEMPO[level]);
      eventsRef.current = events;
      bufferRef.current = null;
      return events.map((e) => ({ note: e.note, delay: PRE + e.t }));
    }


    setStatus('Loading song...');
    const ctx = getCtx();


    if (!cacheRef.current[entry.file]) {
      const res = await fetch(entry.file);
      if (!res.ok) throw new Error('not found');
      cacheRef.current[entry.file] = await ctx.decodeAudioData(
        await res.arrayBuffer()
      );
    }


    setStatus('Analyzing song...');
    await new Promise((r) => setTimeout(r, 50)); // let the UI repaint


    const buffer = cacheRef.current[entry.file];
    bufferRef.current = buffer;
    eventsRef.current = [];
    return analyzeSong(buffer, level);
  };


  const startEntry = async (entry, level) => {
    if (busyRef.current) return;
    busyRef.current = true;


    // reset run state
    completedNotesRef.current = new Set();
    songResultSavedRef.current = false;
    notesPressedRef.current = 0;
    statsRef.current = { ...EMPTY_STATS };
    comboRef.current = { current: 0, max: 0 };
    levelRef.current = level;
    pausedRef.current = false;


    stopSong();
    setResults(null);
    setIsPaused(false);
    setSong([]);
    setScore(0);
    setFeedback('');


    try {
      const notes = await buildNotes(entry, level);


      currentRef.current = entry;
      processedNotes.current = new Set();
      noteRefs.current = {};


      setSong(notes);
      setSongId((id) => id + 1);
      setStatus(notes.length ? entry.title : 'No notes found for this song.');
    } catch (err) {
      setStatus('Could not load that song.');
    }


    busyRef.current = false;
  };


  /* ---------- Handlers ---------- */
  const handleStartGame = () => {
    if (!selected || busyRef.current) return;


    const entry = SONGS.find((s) => s.title === selected);
    if (!entry) return;


    getCtx().resume();
    setGameStarted(true);
    startEntry(entry, difficulty);
  };


  const handleChangeSelection = () => {
    stopSong();
    pausedRef.current = false;
    currentRef.current = null;


    setIsPaused(false);
    setResults(null);
    setSong([]);
    setFeedback('');
    setStatus('Select a song to start');
    setGameStarted(false);
    setSetupTab('difficulty');
  };


  const handleTogglePause = async () => {
    if (!currentRef.current) return;


    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setIsPaused(nextPaused);


    if (!ctxRef.current) return;


    try {
      await (nextPaused ? ctxRef.current.suspend() : ctxRef.current.resume());
    } catch (error) {
      setStatus('Could not change audio playback state.');
    }
  };


  const handleRetrySong = () => {
    if (!currentRef.current) return;


    pausedRef.current = false;
    setIsPaused(false);
    getCtx().resume();
    startEntry(currentRef.current, difficulty);
  };


  const saveResult = (result) => {
    if (!auth.currentUser) {
      const guestResultId = recordGuestGameResult('pianoMan', result);
      setSavePromptResult({ ...result, guestResultId });
      return;
    }


    recordGameResult('pianoMan', result).catch((error) =>
      console.error('Could not save Piano Man result.', error)
    );
  };


  // Called per note; when the last note finishes the song is over
  const handleNoteAnimationEnd = (index) => {
    if (songResultSavedRef.current || !song.length) return;


    completedNotesRef.current.add(index);
    if (completedNotesRef.current.size < song.length) return;


    songResultSavedRef.current = true;
    setStatus('Song finished');


    const stats = { ...statsRef.current };
    const judged = stats.great + stats.ok + stats.meh + stats.miss;
    stats.miss += Math.max(0, song.length - judged);


    const finalScore = calcScore(stats);


    setResults({
      title: currentRef.current.title,
      difficulty: levelRef.current,
      score: finalScore,
      stats,
      accuracy: calcAccuracy(stats),
      maxCombo: comboRef.current.max,
      totalNotes: song.length,
    });


    saveResult({
      score: finalScore,
      notesPressed: notesPressedRef.current,
      songsCompleted: 1,
    });
  };


  const handleKeyPress = (pressedNote) => {
    if (pausedRef.current) return;


    notesPressedRef.current += 1;


    if (!lineRef.current) return;


    const pitch = pressedNote.toUpperCase();
    const lineX = centerX(lineRef.current);


    // find the closest unprocessed note of this pitch
    let noteEl = null;
    let distance = Infinity;


    song.forEach((n, i) => {
      const el = noteRefs.current[i];
      if (!el || n.note !== pitch || processedNotes.current.has(el)) return;


      const d = Math.abs(lineX - centerX(el));
      if (d < distance) {
        distance = d;
        noteEl = el;
      }
    });


    const type = noteEl ? judge(distance / NOTE_SPEED, levelRef.current) : null;


    if (!type) {
      setFeedback('NO NOTE');
      return;
    }


    processedNotes.current.add(noteEl);
    registerJudgment(type);
    setFeedback(`${type.toUpperCase()}! +${POINTS[type]} (${pressedNote})`);
    noteEl.style.visibility = 'hidden';
  };


  /* ---------- Effects ---------- */


  // Start audio whenever a new song is loaded
  useEffect(() => {
    if (!song.length) return;


    const ctx = getCtx();
    stopSong();


    const base = ctx.currentTime + SYNC_OFFSET + PRE + HIT_OFFSET;


    if (bufferRef.current) {
      const source = ctx.createBufferSource();
      source.buffer = bufferRef.current;
      source.connect(ctx.destination);
      source.start(base);
      sourceRef.current = source;
    } else {
      const master = ctx.createGain();
      master.connect(ctx.destination);
      masterRef.current = master;


      eventsRef.current.forEach((e) =>
        playTone(e.note, base + e.t, e.dur * 0.95, 0.14, master)
      );
    }
  }, [songId]);


  // Stop audio on unmount
  useEffect(() => stopSong, []);


  // Detect notes that passed the hit line without being pressed
  useEffect(() => {
    let animId;


    const checkMisses = () => {
      if (!pausedRef.current && lineRef.current) {
        const lineX = centerX(lineRef.current);
        const missPx = JUDGE_WINDOWS[levelRef.current].meh * NOTE_SPEED;


        Object.values(noteRefs.current).forEach((noteEl) => {
          if (!noteEl || processedNotes.current.has(noteEl)) return;


          if (centerX(noteEl) < lineX - missPx) {
            processedNotes.current.add(noteEl);
            registerJudgment('miss');
            setFeedback('MISS!');
          }
        });
      }


      animId = requestAnimationFrame(checkMisses);
    };


    animId = requestAnimationFrame(checkMisses);
    return () => cancelAnimationFrame(animId);
  }, []);


  /* ---------- Render ---------- */
  return (
    <main>
      <div className={`pianoman-page${isPaused ? ' is-paused' : ''}`}>
        {!gameStarted && (
          <section className="pianoman-setup">
            <div className="setup-tabs">
              {['difficulty', 'songs'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={setupTab === tab ? 'active' : ''}
                  onClick={() => setSetupTab(tab)}
                >
                  {tab === 'difficulty' ? 'Difficulty' : 'Songs'}
                </button>
              ))}
            </div>


            {setupTab === 'difficulty' ? (
              <div className="setup-content difficulty-content">
                <h1>Difficulty</h1>
                {DIFFICULTIES.map(({ key, label, className }) => (
                  <button
                    key={key}
                    type="button"
                    className={`difficulty-choice ${className} ${
                      difficulty === key ? 'selected' : ''
                    }`}
                    onClick={() => setDifficulty(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="setup-content songs-content">
                <h1>Songs</h1>
                <div className="song-list">
                  {SONGS.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      className={`song-choice ${
                        selected === s.title ? 'selected' : ''
                      }`}
                      onClick={() => setSelected(s.title)}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}


            <div className="selection-summary">
              <div>
                Song: <strong>{selected || 'None selected'}</strong>
              </div>
              <div>
                Difficulty: <strong>{difficultyLabel(difficulty)}</strong>
              </div>
            </div>


            <button
              type="button"
              className="start-game-button"
              disabled={!selected || busyRef.current}
              onClick={handleStartGame}
            >
              Start Game
            </button>
          </section>
        )}


        {gameStarted && (
          <>
            <button
              className="pause-button"
              type="button"
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
              disabled={!currentRef.current}
              onClick={handleTogglePause}
            >
              <img src="/assets/settingsbar.png" alt="" className="pause-icon" />
            </button>


            <div className="healthbar"></div>


            <div className="score-board">
              Score: {score} | {feedback}
            </div>


            <button
              type="button"
              className="change-selection-button"
              onClick={handleChangeSelection}
            >
              Change Song / Difficulty
            </button>


            <div className="song-status">{status}</div>


            <div className="container">
              {song.map((n, i) => (
                <div
                  key={`${songId}-${i}`}
                  ref={(el) => (noteRefs.current[i] = el)}
                  className={`note ${n.note.toLowerCase()}note`}
                  style={{ animationDelay: `${n.delay}s` }}
                  onAnimationEnd={() => handleNoteAnimationEnd(i)}
                ></div>
              ))}


              <img src="/assets/pmannotes.png" alt="notes" className="staff" />
              <div ref={lineRef} className="line"></div>
            </div>


            <div className="containerlogo">
              <img src="/assets/logo.png" alt="logo" className="logo" />
            </div>


            <div className="containernotes">
              <Keyboard ilawNote="C" Press={handleKeyPress} />
            </div>
          </>
        )}


        {isPaused && gameStarted && (
          <div className="pause-overlay">
            <section
              className="pause-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pianoman-paused-title"
            >
              <h2 id="pianoman-paused-title">Paused</h2>


              <button type="button" autoFocus onClick={handleTogglePause}>
                Resume
              </button>
              <button type="button" onClick={handleRetrySong}>
                Retry
              </button>
              <button type="button" onClick={() => onNavigate('minigame')}>
                Return to menu
              </button>
            </section>
          </div>
        )}


        {results && (
          <ResultsScreen
            {...results}
            onRetry={handleRetrySong}
            onMenu={() => onNavigate('minigame')}
          />
        )}


        {savePromptResult && (
          <AccountSavePrompt
            mode="pianoMan"
            result={savePromptResult}
            onNavigate={onNavigate}
            onDismiss={() => setSavePromptResult(null)}
          />
        )}
      </div>
    </main>
  );
}


export default PianoMan;


