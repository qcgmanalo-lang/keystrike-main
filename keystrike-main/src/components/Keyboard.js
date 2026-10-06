import React, { useRef } from 'react';
import Keynote from "./Keynote";

// 1. Keep this as an array so .map() works perfectly
const NOTES = ["C", "D", "E", "F", "G", "A", "B"];

function Keyboard({ ilawNote, Press }) {
    const audioCache = useRef({});

    const handleKeyClick = (note) => {
        if (!audioCache.current[note]) {
            audioCache.current[note] = new Audio(`/sounds/${note.toLowerCase()}.mp3`);
        }

        const audio = audioCache.current[note];
        audio.currentTime = 0;
        audio.play().catch(() => {});

        if (Press) {
            Press(note);
        }
    };

    return (
        <div className="keyboard">
            {NOTES.map((note) => (
                <Keynote 
                    key={note} 
                    note={note} 
                    ilaw={note === ilawNote} 
                    pindot={handleKeyClick}
                />
            ))}
        </div>
    );
}

export default Keyboard;
