import React from 'react';

export default function Header({ currentQuestion, totalQuestions, score }) {
  const progressPercent = (currentQuestion / totalQuestions) * 100;

  return (
    <div className="header-container">
      <div className="quiz-header">
        <span className="question-tracker">
          Question {currentQuestion}/{totalQuestions}
        </span>
        <span className="score-tracker">SCORE: {score}</span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
    </div>
  );
}