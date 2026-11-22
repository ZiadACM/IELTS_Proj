// Answer Replay drawn on the map (ticket 10; D23, D25, D27), as in the owner-approved prototype (map-format-v2,
// variant D). It draws one moment, `view`, computed by replay.ts from the authored route: earlier legs faded, the
// current leg's line with a numbered start ring, the place just named lit, places named by mistake in a dashed frame,
// a correction's wrong path, the walker, and at the end every answer framed and numbered together. The route goes
// `under` the letters, with the walker, so no letter is ever hidden (on arrival the letter covers the walker and the
// lit frame marks the place); the summary goes `over` them.
// `unit` is map units per screen pixel, so sizes given in px stay the same on every screen.
import type { MapData, Point } from './api.ts';
import { BOX_PX, LABEL_PX, rectOf, textPx } from './MapV2.tsx';
import type { Lit, Mistaken, ReplayView } from './replay.ts';

const V1_DISC_PX = 15; // a v1 letter's disc radius (ItemMap)
const V1_SQUARE_PX = 8; // a v1 landmark's square

type Box = { x: number; y: number; w: number; h: number };
const points = (line: Point[]) => line.map((p) => `${p.x},${p.y}`).join(' ');

// The letter at an answer place: the target nearest the authored point (a destination is within 20 units of it).
const nearestTarget = (map: MapData, at: Point) =>
  map.targets.reduce((best, t) =>
    Math.hypot(t.x - at.x, t.y - at.y) < Math.hypot(best.x - at.x, best.y - at.y) ? t : best,
  );

// A box around a letter, one size for v1 discs and v2 boxes.
function letterBox(map: MapData, at: Point, unit: number, pad: number): Box {
  const half = (map.format === 2 ? BOX_PX / 2 : V1_DISC_PX) * unit + pad * unit;
  return { x: at.x - half, y: at.y - half, w: 2 * half, h: 2 * half };
}

// A landmark's place on the map: its room (v2, inset from the walls), its symbol with the label under it (v2), or the
// small square and the space around it (v1). Null for an entrance: the leg's numbered ring already marks it.
function landmarkBox(map: MapData, landmarkId: string, unit: number): Box | null {
  const l = map.landmarks.find((x) => x.id === landmarkId);
  if (!l || l.entrance) return null;
  const area = l.area ? map.areas?.find((a) => a.id === l.area) : undefined;
  const r = area && rectOf(area);
  if (r) return { x: r.x + 3 * unit, y: r.y + 3 * unit, w: r.w - 6 * unit, h: r.h - 6 * unit };
  if (map.format === 2) {
    // Tight around the symbol and its label (the label's baseline is 13 px below the point).
    const w = (textPx(l.label, LABEL_PX) + 10) * unit;
    return { x: l.x - w / 2, y: l.y - 6 * unit, w, h: 23 * unit };
  }
  const half = (V1_SQUARE_PX / 2 + 8) * unit;
  return { x: l.x - half, y: l.y - half, w: 2 * half, h: 2 * half };
}

function litBox(map: MapData, lit: Lit, unit: number): Box | null {
  if (!lit) return null;
  if ('answerAt' in lit) return letterBox(map, nearestTarget(map, lit.answerAt), unit, 6);
  return landmarkBox(map, lit.landmarkId, unit);
}

// Where a dashed "named by mistake" frame goes: a distractor's landmark; for a correction, the letter in the room whose
// door the wrong path ends at, else the nearest letter (the wrong place is a door or a corridor point, not a letter).
function mistakenBox(map: MapData, m: Mistaken, unit: number): Box {
  const place = m.landmarkId ? landmarkBox(map, m.landmarkId, unit) : null;
  if (place) return place;
  const room = map.areas?.find((a) => {
    const r = a.kind === 'room' && a.door ? rectOf(a) : null;
    if (!r || !a.door) return false;
    const onSide =
      a.door.side === 'n'
        ? m.at.y === r.y
        : a.door.side === 's'
          ? m.at.y === r.y + r.h
          : a.door.side === 'w'
            ? m.at.x === r.x
            : m.at.x === r.x + r.w;
    const along =
      a.door.side === 'n' || a.door.side === 's'
        ? m.at.x >= r.x && m.at.x <= r.x + r.w
        : m.at.y >= r.y && m.at.y <= r.y + r.h;
    return onSide && along;
  });
  const inRoom = room && map.targets.find((t) => t.area === room.id);
  return letterBox(map, inRoom ?? nearestTarget(map, m.at), unit, 6);
}

function StartRing({ at, n, unit }: { at: Point; n: number; unit: number }) {
  return (
    <g className="replay-start">
      <circle className="replay-ring" cx={at.x} cy={at.y} r={8 * unit} strokeWidth={2.5 * unit} />
      <text className="replay-number" x={at.x} y={at.y} dy="0.36em" fontSize={10 * unit}>
        {n}
      </text>
    </g>
  );
}

export function ReplayLayer({
  map,
  unit,
  view,
  answers,
  layer,
}: {
  map: MapData;
  unit: number;
  view: ReplayView;
  answers: string[]; // the correct letter of each question, in question order
  layer: 'under' | 'over';
}) {
  const box = (b: Box | null, className: string, key?: string | number) =>
    b && <rect key={key} className={className} x={b.x} y={b.y} width={b.w} height={b.h} rx={4 * unit} />;
  if (layer === 'over')
    return (
      <g className="replay">
        {view.summary &&
          answers.map((label, i) => {
            const t = map.targets.find((x) => x.label === label);
            if (!t) return null;
            const frame = letterBox(map, t, unit, 5);
            return (
              <g key={label} className="replay-summary" style={{ animationDelay: `${i * 140}ms` }}>
                <rect
                  className="replay-summary-frame"
                  x={frame.x}
                  y={frame.y}
                  width={frame.w}
                  height={frame.h}
                  rx={4 * unit}
                  strokeWidth={3.5 * unit}
                />
                <circle className="replay-summary-badge" cx={frame.x + frame.w} cy={frame.y} r={9 * unit} />
                <text className="replay-number" x={frame.x + frame.w} y={frame.y} dy="0.36em" fontSize={11 * unit}>
                  {i + 1}
                </text>
              </g>
            );
          })}
      </g>
    );
  const lit = litBox(map, view.lit, unit);
  return (
    <g className="replay" strokeWidth={4 * unit}>
      {view.earlier.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: legs are a fixed sequence
        <g key={i} className={view.summary ? 'replay-leg summary' : 'replay-leg earlier'}>
          <polyline className="replay-line" points={points(line)} />
          <StartRing at={line[0]} n={i + 1} unit={unit} />
        </g>
      ))}
      {view.mistaken.map((m, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: frames follow the authored order
        <g key={i} className="replay-mistaken" strokeWidth={2.5 * unit} strokeDasharray={`${5 * unit} ${4 * unit}`}>
          {box(mistakenBox(map, m, unit), 'frame')}
        </g>
      ))}
      {!view.summary && view.line.length > 0 && (
        <g className="replay-leg current">
          {lit && <g strokeWidth={3 * unit}>{box(lit, 'replay-lit')}</g>}
          {view.line.length > 1 && <polyline className="replay-line" points={points(view.line)} />}
          <StartRing at={view.line[0]} n={view.leg + 1} unit={unit} />
        </g>
      )}
      {view.wrong.map((w, i) => (
        <polyline
          // biome-ignore lint/suspicious/noArrayIndexKey: wrong paths follow the authored order
          key={i}
          className="replay-wrong"
          points={points(w.points)}
          strokeDasharray={w.dashed ? `${7 * unit} ${6 * unit}` : undefined}
        />
      ))}
      {view.head && (
        <circle className="replay-head" cx={view.head.x} cy={view.head.y} r={7 * unit} strokeWidth={1.5 * unit} />
      )}
    </g>
  );
}
