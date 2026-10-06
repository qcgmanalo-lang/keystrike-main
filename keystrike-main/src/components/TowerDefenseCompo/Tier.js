import "./Tier.css";
 
function Tier({ tier = 1, mobs = 5 }) {
  return (
    <div className="tier">
      <span className="tier-label">Tier</span>
      <span className="tier-number">{tier}</span>
      <span className="tier-mobs">{mobs} mobs incoming</span>
    </div>
  );
}
 
export default Tier;
 