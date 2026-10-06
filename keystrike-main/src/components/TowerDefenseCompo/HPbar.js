import "./HPbar.css";

function HPbar({ hp = 100, maxHp = 100 }) {

  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  return (
    <div
      className="hpbar"
      role="progressbar"
      aria-label="Base health"
      aria-valuemin="0"
      aria-valuemax={maxHp}
      aria-valuenow={hp}
    >
      <div className="hpbar-track">
        <div className="hpbar-cover" style={{ width: `${100 - percent}%` }} />
      </div>
      <span className="hpbar-text">{hp} / {maxHp}</span>
    </div>
  );
}

export default HPbar;