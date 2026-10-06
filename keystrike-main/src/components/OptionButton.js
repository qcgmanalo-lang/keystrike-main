import React from 'react';

export default function OptionButton({
  option,
  selectedOption,
  correctOption,
  onClick,
  disabled,
}) {
  const isSelected = selectedOption === option;
  const isCorrect = isSelected && option === correctOption;
  const isWrong = isSelected && option !== correctOption;

  let btnClass = 'option-btn';
  if (isCorrect) btnClass += ' correct';
  if (isWrong) btnClass += ' wrong';

  return (
    <button
      type="button"
      className={btnClass}
      onClick={onClick}
      disabled={disabled}
    >
      {option}
    </button>
  );
}