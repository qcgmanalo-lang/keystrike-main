import "./Mobs.css";

function Mobs({ active, waiting }) {
  return (
    <div className="mob-count" aria-live="polite">
      <span>{active} on the field</span>
      <span>{waiting} incoming</span>
    </div>
  );
}

export default Mobs;