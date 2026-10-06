import React, { useEffect, useRef, useState } from 'react';
import StaffCard from './StaffCard';
import OptionButton from './OptionButton';
import QuizCompleteModal from './QuizCompleteModal';
import { recordGameResult, recordGuestGameResult } from '../achievements';
import { auth } from '../firebase';
import AccountSavePrompt from './AccountSavePrompt';
import './pianolesson.css';

const QUIZ_QUESTIONS = [
  { id: 1, note: 'B4', targetNote: 'B', options: ['C', 'D', 'B'] },
  { id: 2, note: 'C4', targetNote: 'C', options: ['C', 'E', 'G'] },
  { id: 3, note: 'D4', targetNote: 'D', options: ['D', 'F', 'A'] },
  { id: 4, note: 'E4', targetNote: 'E', options: ['C', 'E', 'B'] },
  { id: 5, note: 'F4', targetNote: 'F', options: ['F', 'G', 'D'] },
  { id: 6, note: 'G4', targetNote: 'G', options: ['E', 'G', 'A'] },
  { id: 7, note: 'A4', targetNote: 'A', options: ['F', 'A', 'C'] },
  { id: 8, note: 'B4', targetNote: 'B', options: ['B', 'D', 'G'] },
  { id: 9, note: 'C5', targetNote: 'C', options: ['A', 'C', 'E'] },
  { id: 10, note: 'D5', targetNote: 'D', options: ['B', 'D', 'F'] },
];

export default function PianoLesson({ onNavigate }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [savePromptResult, setSavePromptResult] = useState(null);
  const resultSavedRef = useRef(false);

  const currentQuestion = QUIZ_QUESTIONS[currentIndex];

  useEffect(() => {
    if (!showModal || resultSavedRef.current) return;
    resultSavedRef.current = true;
    const result = {
      score,
      notesPressed: correctCount + incorrectCount,
      perfect: score === QUIZ_QUESTIONS.length * 100,
    };
    if (!auth.currentUser) {
      const guestResultId = recordGuestGameResult('pianoLesson', result);
      setSavePromptResult({ ...result, guestResultId });
      return;
    }
    recordGameResult('pianoLesson', result)
      .catch((error) => console.error('Could not save Piano Lesson result.', error));
  }, [showModal, score, correctCount, incorrectCount]);

  const handleOptionClick = (option) => {
    if (selectedOption !== null) return;

    setSelectedOption(option);

    const isCorrect = option === currentQuestion.targetNote;
    if (isCorrect) {
      setScore((prev) => prev + 100);
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }

    setTimeout(() => {
      setIsFlipping(true);

      setTimeout(() => {
        if (currentIndex + 1 < QUIZ_QUESTIONS.length) {
          setCurrentIndex((prev) => prev + 1);
          setSelectedOption(null);
          setIsFlipping(false);
        } else {
          setShowModal(true);
        }
      }, 300);
    }, 700);
  };

  const handleRestart = () => {
    resultSavedRef.current = false;
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setSelectedOption(null);
    setIsFlipping(false);
    setShowModal(false);
  };

  return (
    <div className="piano-lesson-wrapper">
      <button className="piano-lesson-back" type="button" aria-label="Back to Play Menu" onClick={() => onNavigate('playmenu')}>
        <img src="/assets/back.png" alt="" />
      </button>
      <div className="phone-screen">
        {/* Header */}
        <div className="quiz-header">
          <span className="question-count">
            Question {currentIndex + 1}/{QUIZ_QUESTIONS.length}
          </span>
          <span className="score-display">SCORE: {score}</span>
        </div>
        <div className="header-divider"></div>

        {/* Main Flashcard Content */}
        <main className="quiz-content">
          <p className="instruction-text">What note is this?</p>

          <div className={`flashcard-container ${isFlipping ? 'flip' : ''}`}>
            <div className="flashcard-card">
              <StaffCard note={currentQuestion.note} />
            </div>
          </div>

          <div className="options-row">
            {currentQuestion.options.map((option) => (
              <OptionButton
                key={option}
                option={option}
                selectedOption={selectedOption}
                correctOption={currentQuestion.targetNote}
                onClick={() => handleOptionClick(option)}
                disabled={selectedOption !== null}
              />
            ))}
          </div>

          <p className="footer-prompt">TAP THE CORRECT NOTE</p>
        </main>

        {showModal && (
          <QuizCompleteModal
            score={score}
            totalPoints={QUIZ_QUESTIONS.length * 100}
            correctCount={correctCount}
            incorrectCount={incorrectCount}
            onRestart={handleRestart}
          />
        )}
      </div>
      {savePromptResult && (
        <AccountSavePrompt
          mode="pianoLesson"
          result={savePromptResult}
          onNavigate={onNavigate}
          onDismiss={() => setSavePromptResult(null)}
        />
      )}
    </div>
  );
}