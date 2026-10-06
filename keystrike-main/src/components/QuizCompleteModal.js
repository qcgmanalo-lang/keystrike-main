import React from 'react';

export default function QuizCompleteModal({
  score,
  totalPoints,
  correctCount,
  incorrectCount,
  onRestart,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2 className="modal-title">LESSON COMPLETE!</h2>

        <div className="modal-stats">
          <div className="stat-row">
            <span>Points Earned:</span>
            <span className="stat-value gold">{score} / {totalPoints}</span>
          </div>
          <div className="stat-row">
            <span>Correct Answers:</span>
            <span className="stat-value green">{correctCount}</span>
          </div>
          <div className="stat-row">
            <span>Incorrect Answers:</span>
            <span className="stat-value red">{incorrectCount}</span>
          </div>
        </div>

        <button type="button" className="retry-btn" onClick={onRestart}>
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}