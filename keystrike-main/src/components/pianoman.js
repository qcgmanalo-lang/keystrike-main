import React, { useRef, useState, useEffect } from 'react';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import './pianoman.css';
import Keyboard from './Keyboard.js';
import AccountSavePrompt from './AccountSavePrompt';
import ResultsScreen from './ResultsScreen';
import { POINTS, JUDGE_WINDOWS, judge, calcAccuracy } from './judgement';


// ---------------- Your songs ----------------
// Built-in song: { title, bpm, notes }
//   notes = notes separated by spaces. "C" = 1 beat, "G:2" = 2 beats, "-:1" = rest.
//   Use only C D E F G A B.
// Audio-file song: { title, file }  (put the file in public/assets/songs/)
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
    notes:
      'E E F G G F E D C C D E E D D:2 E E F G G F E D C C D E D C C:2',
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
    notes: 'C D E C C D E C E F G:2 E F G:2 G A G F E C G A G F E C C G C:2 C G C:2',
  },
  // Example of an audio-file song:
  // { title: 'My Song', file: '/assets/songs/mysong.mp3' },
];


const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const FREQ = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88 };


// Must match "animation: moveLeft 5s" in the CSS.
const ANIM_DURATION = 5;
// Seconds from a note's animation start until it reaches the hit line
const HIT_OFFSET = ANIM_DURATION * (0.1 + (0.9 * (320 - 64)) / 360);
const PRE = 1;              // seconds of lead-in before the song's first moment
const SYNC_OFFSET = 0;      // nudge (in seconds) if audio and notes feel off
// Notes travel 360px during 90% of the animation -> pixels per second
const NOTE_SPEED = 360 / (ANIM_DURATION * 0.9);


// ---------------- Tuning ----------------
// Built-in songs: difficulty changes the tempo
const TEMPO = { easy: 0.8, normal: 1, hard: 1.2 };


// Audio-file songs: difficulty changes how many notes are picked
// gap    = minimum seconds between notes (notes are ~80px/s, 35px wide, so keep >= 0.45)
// perSec = maximum notes per second of song
const DIFFICULTY = {
  easy:   { gap: 0.8,  perSec: 1.2 },
  normal: { gap: 0.55, perSec: 2 },
  hard:   { gap: 0.45, perSec: 3 },
};
const MIN_SCORE = 1.3;      // how much a hit must stand out from its surroundings (lower = more candidates)
const CONTINUITY = 0.15;    // bonus for notes near the previous note (0 = fully independent)
const PITCH_WINDOW = 4096;  // samples used to detect pitch after each hit


const FRAME = 1024;
const HOP = 512;


// ---------------- Built-in songs ----------------


// "C C G:2 -:1" -> [{ note, t, dur }] in seconds
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


// ---------------- Audio analysis (for audio-file songs) ----------------


// In-place FFT (radix-2)
function fft(re, im) {
  const n = re.length;
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
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}


function toMono(buffer) {
  const ch = buffer.numberOfChannels;
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < ch; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += d[i] / ch;
  }
  return out;
}


function makeHann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}


// Spectral flux: how much new sound energy appears in each frame
function onsetEnvelope(data, sr) {
  const hann = makeHann(FRAME);
  const bins = Math.min(FRAME / 2, Math.floor(8000 / (sr / FRAME))); // ignore above ~8kHz
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


// Strength of one frequency in a chunk of audio (Goertzel algorithm)
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


// semitone (0 = C ... 11 = B) -> index in NOTES, or null for black keys
const WHITE_IDX = [0, null, 1, null, 2, 3, null, 4, null, 5, null, 6];


// Pick which of C D E F G A B fits the sound right after this moment
function detectNote(data, sr, time, history, hann) {
  const last = history.length ? history[history.length - 1] : 'C';
  const start = Math.floor((time + 0.02) * sr); // skip the very start of the hit (noisy)
  if (start + PITCH_WINDOW >= data.length) return last;


  // energy of each of the 12 pitch classes over 3 octaves
  const chroma = new Array(12).fill(0);
  for (let s = 0; s < 12; s++) {
    [0.5, 1, 2].forEach((oct) => {
      const f = FREQ.C * Math.pow(2, s / 12) * oct;
      chroma[s] += Math.sqrt(goertzel(data, start, PITCH_WINDOW, f, sr, hann));
    });
  }


  // fold onto white keys (a black key counts half for each neighbor)
  const white = new Array(7).fill(0);
  for (let s = 0; s < 12; s++) {
    if (WHITE_IDX[s] !== null) white[WHITE_IDX[s]] += chroma[s];
    else {
      white[WHITE_IDX[s - 1]] += chroma[s] / 2;
      white[WHITE_IDX[s + 1]] += chroma[s] / 2;
    }
  }


  // prefer notes close to the previous one so the melody flows
  const prevIdx = history.length ? NOTES.indexOf(last) : -1;
  const scored = white.map((v, i) => ({
    i,
    v: v * (prevIdx >= 0 && Math.abs(i - prevIdx) <= 1 ? 1 + CONTINUITY : 1),
  }));
  scored.sort((a, b) => b.v - a.v);


  // avoid the same note three times in a row
  let pick = scored[0].i;
  const n = history.length;
  if (n >= 2 && history[n - 1] === NOTES[pick] && history[n - 2] === NOTES[pick]) {
    pick = scored[1].i;
  }
  return NOTES[pick];
}


// Turn an audio buffer into a list of notes: { note, delay }
function analyzeSong(buffer, level) {
  const { gap, perSec } = DIFFICULTY[level];
  const data = toMono(buffer);
  const sr = buffer.sampleRate;
  const duration = buffer.duration;


  const flux = onsetEnvelope(data, sr);
  const n = flux.length;


  // running sums so we can get a local average cheaply
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + flux[i];
  const W = Math.round((0.6 * sr) / HOP); // compare with ~0.6s around each frame


  // 1) find every local peak and score how much it stands out
  const cands = [];
  for (let i = 3; i < n - 3; i++) {
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


    const t = (i * HOP + FRAME * 0.6) / sr; // where the new sound really starts
    if (t < 0.5 || t > duration - 1) continue;
    cands.push({ t, score });
  }


  // 2) keep the strongest hits, respecting the spacing and density limits
  cands.sort((a, b) => b.score - a.score);
  const target = Math.max(1, Math.round(duration * perSec));
  const picked = [];
  for (const c of cands) {
    if (picked.length >= target) break;
    if (picked.every((p) => Math.abs(p.t - c.t) >= gap)) picked.push(c);
  }
  picked.sort((a, b) => a.t - b.t);


  // 3) choose a key for each hit
  const hann = makeHann(PITCH_WINDOW);
  const history = [];
  return picked.map((p) => {
    const note = detectNote(data, sr, p.t, history, hann);
    history.push(note);
    return { note, delay: PRE + p.t }; // seconds after mount when this note starts moving
  });
}


// ---------------- Component ----------------


function PianoMan({ onNavigate }) {
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


  const lineRef = useRef(null);
  const noteRefs = useRef({});
  const notesPressedRef = useRef(0);
  // Track notes that have already been scored or missed so we don't count them repeatedly
  const processedNotes = useRef(new Set());
  const completedNotesRef = useRef(new Set());
  const songResultSavedRef = useRef(false);
  // Judgement tracking (great / ok / meh / miss counts, combo, current difficulty)
  const statsRef = useRef({ great: 0, ok: 0, meh: 0, miss: 0 });
  const comboRef = useRef({ current: 0, max: 0 });
  const levelRef = useRef('normal');


  const ctxRef = useRef(null);
  const currentRef = useRef(null);     // the song entry currently loaded
  const bufferRef = useRef(null);      // decoded audio (audio-file songs only)
  const eventsRef = useRef([]);        // melody events (built-in songs only)
  const cacheRef = useRef({});         // file -> decoded audio, so files load only once
  const sourceRef = useRef(null);
  const masterRef = useRef(null);
  const busyRef = useRef(false);
  const pausedRef = useRef(false);


  // Record one judgement (great / ok / meh / miss) and update score + combo
  const registerJudgment = (type) => {
    const s = statsRef.current;
    s[type] += 1;
    const c = comboRef.current;
    if (type === 'miss') c.current = 0;
    else {
      c.current += 1;
      c.max = Math.max(c.max, c.current);
    }
    setScore(s.great * POINTS.great + s.ok * POINTS.ok + s.meh * POINTS.meh);
  };


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
      masterRef.current.disconnect(); // silences any scheduled melody notes
      masterRef.current = null;
    }
  };


  // A short tone (used for key presses and for built-in songs)
  const playTone = (note, when, dur = 0.35, vol = 0.12, dest) => {
    const ctx = getCtx();
    const t0 = when === undefined ? ctx.currentTime : when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = FREQ[note];
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(dur, 0.1));
    osc.connect(gain).connect(dest || ctx.destination);
    osc.start(t0);
    osc.stop(t0 + Math.max(dur, 0.1) + 0.05);
  };


  // Load a song entry at a difficulty and start the game
  const startEntry = async (entry, level) => {
    if (busyRef.current) return;
    busyRef.current = true;
    completedNotesRef.current = new Set();
    songResultSavedRef.current = false;
    notesPressedRef.current = 0;
    statsRef.current = { great: 0, ok: 0, meh: 0, miss: 0 };
    comboRef.current = { current: 0, max: 0 };
    levelRef.current = level;
    setResults(null);


    stopSong();
    pausedRef.current = false;
    setIsPaused(false);
    setSong([]);
    setScore(0);
    setFeedback('');


    try {
      let notes;
      if (entry.notes) {
        // built-in song: notes come straight from the melody
        const events = buildMelody(entry.notes, entry.bpm * TEMPO[level]);
        eventsRef.current = events;
        bufferRef.current = null;
        notes = events.map((e) => ({ note: e.note, delay: PRE + e.t }));
      } else {
        // audio-file song: load, then analyze
        setStatus('Loading song...');
        const ctx = getCtx();
        if (!cacheRef.current[entry.file]) {
          const res = await fetch(entry.file);
          if (!res.ok) throw new Error('not found');
          cacheRef.current[entry.file] = await ctx.decodeAudioData(await res.arrayBuffer());
        }
        setStatus('Analyzing song...');
        await new Promise((r) => setTimeout(r, 50)); // let the status text show first
        const buffer = cacheRef.current[entry.file];
        notes = analyzeSong(buffer, level);
        bufferRef.current = buffer;
        eventsRef.current = [];
      }


      currentRef.current = entry;
      processedNotes.current = new Set();
      noteRefs.current = {};
      setSong(notes);
      setSongId((id) => id + 1); // new key -> note elements remount -> animations restart
      setStatus(notes.length ? entry.title : 'No notes found for this song.');
    } catch (err) {
      setStatus('Could not load that song.');
    }
    busyRef.current = false;
  };


  const handleSelectSong = (e) => {
    const title = e.target.value;
    setSelected(title);
    if (!title) return;
    getCtx().resume(); // browsers need audio to start from a click
    startEntry(SONGS.find((s) => s.title === title), difficulty);
  };


  // Changing difficulty (or clicking the current one) restarts the current song
  const handleDifficulty = (level) => {
    setDifficulty(level);
    if (currentRef.current) startEntry(currentRef.current, level);
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

  const handleNoteAnimationEnd = (index) => {
    if (songResultSavedRef.current || !song.length) return;
    completedNotesRef.current.add(index);
    if (completedNotesRef.current.size < song.length) return;

    songResultSavedRef.current = true;
    setStatus('Song finished');

    // any note that was never judged (e.g. tab in background) counts as a miss
    const stats = { ...statsRef.current };
    const judged = stats.great + stats.ok + stats.meh + stats.miss;
    stats.miss += Math.max(0, song.length - judged);
    const finalScore =
      stats.great * POINTS.great + stats.ok * POINTS.ok + stats.meh * POINTS.meh;

    setResults({
      title: currentRef.current.title,
      difficulty: levelRef.current,
      score: finalScore,
      stats,
      accuracy: calcAccuracy(stats),
      maxCombo: comboRef.current.max,
      totalNotes: song.length,
    });

    const result = { score: finalScore, notesPressed: notesPressedRef.current, songsCompleted: 1 };
    if (!auth.currentUser) {
      const guestResultId = recordGuestGameResult('pianoMan', result);
      setSavePromptResult({ ...result, guestResultId });
      return;
    }
    recordGameResult('pianoMan', result)
      .catch((error) => console.error('Could not save Piano Man result.', error));
  };


  // When a new song is rendered, start its audio so each sound
  // lands at the same moment as its note reaches the line
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
      eventsRef.current.forEach((e) => playTone(e.note, base + e.t, e.dur * 0.95, 0.14, master));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);


  // Stop audio when leaving the page
  useEffect(() => stopSong, []);


  // Real-time check loop to detect when notes cross past the line untouched
  useEffect(() => {
    let animId;


    const checkMisses = () => {
      if (!pausedRef.current && lineRef.current) {
        const lineRect = lineRef.current.getBoundingClientRect();
        const lineCenterX = lineRect.left + lineRect.width / 2;
        // a note is missed once it's past the line by more than the widest hit window
        const missPx = JUDGE_WINDOWS[levelRef.current].meh * NOTE_SPEED;


        Object.keys(noteRefs.current).forEach((noteKey) => {
          const noteEl = noteRefs.current[noteKey];
          if (!noteEl || processedNotes.current.has(noteEl)) return;


          const noteRect = noteEl.getBoundingClientRect();
          const noteCenterX = noteRect.left + noteRect.width / 2;


          // If note moves past line tolerance zone and hasn't been hit yet
          if (noteCenterX < lineCenterX - missPx) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleKeyPress = (pressedNote) => {
    if (pausedRef.current) return;
    notesPressedRef.current += 1;
    const pitch = pressedNote.toUpperCase();


    if (!lineRef.current) return;


    const lineRect = lineRef.current.getBoundingClientRect();
    const lineCenterX = lineRect.left + lineRect.width / 2;


    // There are many notes of the same pitch, so pick the closest unprocessed one
    let noteEl = null;
    let distance = Infinity;
    song.forEach((n, i) => {
      const el = noteRefs.current[i];
      if (!el || n.note !== pitch || processedNotes.current.has(el)) return;
      const rect = el.getBoundingClientRect();
      const d = Math.abs(lineCenterX - (rect.left + rect.width / 2));
      if (d < distance) {
        distance = d;
        noteEl = el;
      }
    });


    // Convert pixel distance to seconds off the exact beat, then judge it
    const type = noteEl ? judge(distance / NOTE_SPEED, levelRef.current) : null;

    if (type) {
      processedNotes.current.add(noteEl);
      registerJudgment(type);
      setFeedback(`${type.toUpperCase()}! +${POINTS[type]} (${pressedNote})`);
      noteEl.style.visibility = 'hidden';
    } else {
      // stray press (no note close enough) - shown but not counted in the stats
      setFeedback('NO NOTE');
    }
  };


  return (
    <main>
      <div className={`pianoman-page${isPaused ? ' is-paused' : ''}`}>
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
        <div className="score-board">Score: {score} | {feedback}</div>


        <select className="song-select" value={selected} onChange={handleSelectSong}>
          <option value="">Select a song</option>
          {SONGS.map((s) => (
            <option key={s.title} value={s.title}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="song-status">{status}</div>


        <div className="difficulty">
          {Object.keys(DIFFICULTY).map((lvl) => (
            <button
              key={lvl}
              className={lvl === difficulty ? 'active' : ''}
              onClick={() => handleDifficulty(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>


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
          <Keyboard ilawNote="C" Press={(note) => handleKeyPress(note)} />
        </div>

        {isPaused && (
          <div className="pause-overlay">
            <section className="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pianoman-paused-title">
              <h2 id="pianoman-paused-title">Paused</h2>
              <button type="button" autoFocus onClick={handleTogglePause}>Resume</button>
              <button type="button" onClick={handleRetrySong}>Retry</button>
              <button type="button" onClick={() => onNavigate('minigame')}>Return to menu</button>
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