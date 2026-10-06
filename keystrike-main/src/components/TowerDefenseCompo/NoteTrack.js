import "./NoteTrack.css";
import { Fragment } from "react";

const keyPositions = {
  C: 7.15,
  "C#": 14.3,
  D: 21.45,
  "D#": 28.6,
  E: 35.75,
  F: 50,
  "F#": 57.15,
  G: 64.3,
  "G#": 71.45,
  A: 78.6,
  "A#": 85.75,
  B: 92.9,
};

function NoteTrack({ mobs, travelDuration, onLeak }) {
  return (
    <div className="note-track">
      {mobs.map((mob) => (
        <Fragment key={mob.id}>
          <div
            className={`falling-key${mob.note.includes("#") ? " sharp-key" : ""}`}
            style={{
              left: `${keyPositions[mob.note]}%`,
              animationDuration: `${travelDuration}ms`,
            }}
            aria-label={`Falling piano key ${mob.note}`}
          >
            {mob.note}
          </div>
          <img
            className="monster-journey"
            src={`/monsters/m${mob.monster}.png`}
            alt={`Monster carrying ${mob.note}`}
            style={{ animationDuration: `${travelDuration}ms` }}
            onAnimationEnd={() => onLeak(mob.id)}
          />
        </Fragment>
      ))}
    </div>
  );
}

export default NoteTrack;