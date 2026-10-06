import "./Keynote.css";

function Keynote({note, ilaw, pindot}) {
    const type = note.includes("#") ? "black-key" : "white-key";
    return (
        <button onClick={() => pindot(note)} className={`${type}${ilaw ? " ilaw" : ""}`}>
            {note}
        </button>
    );
}

export default Keynote;