import React from 'react';
import './results.css';
import { calcGrade } from './judgement';

const ROWS = [
  { key: 'great', label: 'Great' },
  { key: 'ok', label: 'Ok' },
  { key: 'meh', label: 'Meh' },
  { key: 'miss', label: 'Miss' },
];

function ResultsScreen({
  title,
  difficulty,
  score,
  accuracy,   // 0 - 100
  stats,      // { great, ok, meh, miss }
  maxCombo,
  totalNotes,
  onRetry,
  onMenu,
}) {
  const grade = calcGrade(accuracy);

  return (
    <div className="results-overlay">
      <section
        className="results-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="results-title"
      >
        <header className="results-header">
          <h2 id="results-title">{title}</h2>
          <span className="results-diff">{difficulty}</span>
        </header>

        <div className="results-ring" style={{ '--acc': `${accuracy}%` }}>
          <div className={`results-grade grade-${grade.toLowerCase()}`}>{grade}</div>
        </div>

        <div className="results-score">{score.toLocaleString()}</div>

        <div className="results-summary">
          <div className="results-stat">
            <span className="results-stat-label">Accuracy</span>
            <span className="results-stat-value">{accuracy.toFixed(2)}%</span>
          </div>
          <div className="results-stat">
            <span className="results-stat-label">Max combo</span>
            <span className="results-stat-value">
              {maxCombo}
              <small> / {totalNotes}</small>
            </span>
          </div>
        </div>

        <div className="results-judgements">
          {ROWS.map((r) => (
            <div key={r.key} className={`results-stat judge-${r.key}`}>
              <span className="results-stat-label">{r.label}</span>
              <span className="results-stat-value">{stats[r.key]}</span>
            </div>
          ))}
        </div>

        <div className="results-actions">
          <button type="button" autoFocus onClick={onRetry}>Retry</button>
          <button type="button" onClick={onMenu}>Return to menu</button>
        </div>
      </section>
    </div>
  );
}

export default ResultsScreen;
