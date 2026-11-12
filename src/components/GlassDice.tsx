const FACES = [
  { side: 'front', pips: [0, 2, 4, 6, 8] },
  { side: 'back', pips: [0, 8] },
  { side: 'right', pips: [0, 2, 6, 8] },
  { side: 'left', pips: [0, 4, 8] },
  { side: 'top', pips: [4] },
  { side: 'bottom', pips: [0, 2, 3, 5, 6, 8] },
];

/** Decorative dice keep the surrounding link's accessible name concise. */
export function GlassDice() {
  return (
    <span className="glass-dice" aria-hidden="true">
      {[0, 1].map((die) => (
        <span className={`glass-die-float glass-die-float--${die}`} key={die}>
          <span className="glass-die">
            {FACES.map(({ side, pips }) => (
              <span className={`glass-die-face glass-die-face--${side}`} key={side}>
                {pips.map((pip) => (
                  <span className="glass-die-pip" key={pip}
                    style={{ gridRow: Math.floor(pip / 3) + 1, gridColumn: pip % 3 + 1 }} />
                ))}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
