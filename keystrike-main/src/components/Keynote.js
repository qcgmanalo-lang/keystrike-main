import React from 'react';
import './pianoman.css'

function Keynote({note, ilaw, pindot}) {
    return (
        <button onClick={() => pindot(note)} className="keys">
            {note}
        </button>
    );
}

export default Keynote;