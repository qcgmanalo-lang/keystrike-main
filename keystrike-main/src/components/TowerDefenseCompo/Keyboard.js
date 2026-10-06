import Keynote from "./Keynote";
import "./Keyboard.css";
import React, { useRef, useEffect, useCallback } from "react";

const whites = ["C", "D", "E", "F", "G", "A", "B"];
const sharps = { C: "C#", D: "D#", F: "F#", G: "G#", A: "A#" };

function Keyboard ({ilawNote, Press, paused = false}) {
    const audioCache = useRef({});

    useEffect(() => {
        const allNotes = [...whites, ...Object.values(sharps)];
        allNotes.forEach((note) => {
            const soundFile = note.includes("#") ? `${encodeURIComponent(note)}.mp3` : `${note.toLowerCase()}.mp3`;
            const audio = new Audio(`/sounds/${soundFile}`);
            audioCache.current[note] = audio;
        });
    }, []);

    useEffect(() => {
        if (paused) {
            Object.values(audioCache.current).forEach((audio) => audio.pause());
        }
    }, [paused]);

    const handleKeyClick = useCallback((note) => {
        if (paused) return;
        const audio = audioCache.current[note];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
        if (Press) Press(note);
    }, [Press, paused]);

    useEffect(() => {
        const keyMap = {
            a: "C", w: "C#", s: "D", e: "D#", d: "E", f: "F",
            t: "F#", g: "G", y: "G#", h: "A", u: "A#", j: "B",
        };
        const handleKeyDown = (event) => {
            if (event.repeat || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            const note = keyMap[event.key.toLowerCase()];
            if (note) handleKeyClick(note);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyClick]);

    return (
        <div className="keyboard">
            {whites.map((note) => (
                <div className="key-wrapper" key={note}>
                <Keynote key={note} note={note} ilaw={note === ilawNote} pindot={handleKeyClick}/> 
                {sharps[note] && (
            <Keynote
              note={sharps[note]}
              ilaw={ilawNote === sharps[note]}
              pindot={handleKeyClick}/>
                )}
                </div>
                 ))}
        </div>
    );
}

export default Keyboard;