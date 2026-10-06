import React from 'react';

const NOTE_POSITIONS = {
  C4: { position: 5, isLedgerLine: true },
  D4: { position: 4.5, isLedgerLine: false },
  E4: { position: 4, isLedgerLine: false },
  F4: { position: 3.5, isLedgerLine: false },
  G4: { position: 3, isLedgerLine: false },
  A4: { position: 2.5, isLedgerLine: false },
  B4: { position: 2, isLedgerLine: false },
  C5: { position: 1.5, isLedgerLine: false },
  D5: { position: 1, isLedgerLine: false },
};

export default function StaffCard({ note }) {
  const noteInfo = NOTE_POSITIONS[note] || { position: 3, isLedgerLine: false };
  const isLedgerLine = noteInfo?.isLedgerLine ?? false;

  return (
    <div className="staff-card-content">
      <svg width="240" height="140" viewBox="0 0 240 140">
        {/* Treble Clef Lines */}
        <line x1="20" y1="30" x2="220" y2="30" stroke="#000" strokeWidth="2" />
        <line x1="20" y1="50" x2="220" y2="50" stroke="#000" strokeWidth="2" />
        <line x1="20" y1="70" x2="220" y2="70" stroke="#000" strokeWidth="2" />
        <line x1="20" y1="90" x2="220" y2="90" stroke="#000" strokeWidth="2" />
        <line x1="20" y1="110" x2="220" y2="110" stroke="#000" strokeWidth="2" />

        {/* Treble Clef Symbol */}
        <text x="30" y="95" fontSize="64" fontFamily="serif" fill="#000">
          𝄞
        </text>

        {/* Note Head */}
        <ellipse
          cx="140"
          cy={noteInfo.position * 20}
          rx="9"
          ry="7"
          fill="#000"
          transform={`rotate(-20 140 ${noteInfo.position * 20})`}
        />

        {/* Note Stem */}
        <line
          x1="148"
          y1={noteInfo.position * 20}
          x2="148"
          y2={noteInfo.position * 20 - 35}
          stroke="#000"
          strokeWidth="2.5"
        />

        {/* Ledger Line */}
        {isLedgerLine && (
          <line
            x1="125"
            y1={noteInfo.position * 20}
            x2="155"
            y2={noteInfo.position * 20}
            stroke="#000"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}