// A content format v2 map (docs/content/map-format-v2.md): the floor plan as drawn in the owner-approved prototype
// (map-format-v2 prototype, variant D), black on white like the exam paper. Rooms with door gaps, the main entrance
// with "You are here", corridor names, trees and the noticeboard, a north arrow, landmark names inside their rooms,
// and answer letters as square boxes. Kinds the prototype did not draw (water, roads, polygons, other symbols) are
// skipped, never fatal: no item uses them yet and their look is not decided.
// `unit` is map units per screen pixel, so sizes given in px stay the same on every screen.
import type { ReactNode } from 'react';
import type { MapArea, MapData } from './api.ts';

export const LABEL_PX = 11; // D22: labels at 11 px inside their rooms
const PATH_LABEL_PX = 10;
export const BOX_PX = 26; // answer letter box side
const LETTER_PX = 15;
const LABEL_FONT = (px: number) => `${px}px system-ui, "Segoe UI", sans-serif`; // matches .map-v2 text

export type Rect = { x: number; y: number; w: number; h: number };
export const rectOf = (a: MapArea): Rect | null =>
  a.rect ? { x: a.rect[0], y: a.rect[1], w: a.rect[2], h: a.rect[3] } : null;

let measureContext: CanvasRenderingContext2D | null | undefined;
export function textPx(text: string, px: number) {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return text.length * 0.56 * px;
  measureContext.font = LABEL_FONT(px);
  return measureContext.measureText(text).width;
}

// A name inside an area: one line if it fits, else two lines split at the middle word, centred in the area.
function AreaLabel({ text, r, unit }: { text: string; r: Rect; unit: number }) {
  const maxWidth = r.w - 8 * unit;
  const words = text.split(' ');
  let lines = [text];
  if (textPx(text, LABEL_PX) * unit > maxWidth && words.length > 1) {
    const middle = Math.ceil(words.length / 2);
    lines = [words.slice(0, middle).join(' '), words.slice(middle).join(' ')];
  }
  const lineHeight = LABEL_PX * 1.2 * unit;
  const top = r.y + r.h / 2 - (lines.length * lineHeight) / 2 + LABEL_PX * unit * 0.95;
  return (
    <>
      {lines.map((line, i) => (
        <text key={line} className="label" x={r.x + r.w / 2} y={top + i * lineHeight} fontSize={LABEL_PX * unit}>
          {line}
        </text>
      ))}
    </>
  );
}

// The gap in a room's wall: `at` is the position along that side, default the middle.
export function doorLine(r: Rect, door: NonNullable<MapArea['door']>, half: number) {
  if (door.side === 'n' || door.side === 's') {
    const x = door.at ?? r.x + r.w / 2;
    const y = door.side === 'n' ? r.y : r.y + r.h;
    return { x1: x - half, y1: y, x2: x + half, y2: y };
  }
  const y = door.at ?? r.y + r.h / 2;
  const x = door.side === 'w' ? r.x : r.x + r.w;
  return { x1: x, y1: y - half, x2: x, y2: y + half };
}

// `under` is drawn above the plan and below the letters (Answer Replay's route), so it never hides a letter.
export function MapV2({
  map,
  unit,
  picked,
  under,
}: {
  map: MapData;
  unit: number;
  picked?: string;
  under?: ReactNode;
}) {
  const areas = map.areas ?? [];
  const byId = new Map(areas.map((a) => [a.id, a]));
  const ofKind = (kind: string) =>
    areas.flatMap((a) => {
      const r = a.kind === kind ? rectOf(a) : null;
      return r ? [{ a, r }] : [];
    });
  const rooms = ofKind('room');
  const entrances = map.entrances ?? [];
  const u = (px: number) => px * unit;

  return (
    <g className="map-v2">
      {ofKind('grass').map(({ a, r }) => (
        <rect key={a.id} className="grass" x={r.x} y={r.y} width={r.w} height={r.h} />
      ))}
      {ofKind('building').map(({ a, r }) => (
        <rect key={a.id} className="wall" x={r.x} y={r.y} width={r.w} height={r.h} strokeWidth={u(3)} />
      ))}
      {rooms.map(({ a, r }) => (
        <rect key={a.id} className="wall room" x={r.x} y={r.y} width={r.w} height={r.h} strokeWidth={u(1.5)} />
      ))}
      {rooms.map(
        ({ a, r }) => a.door && <line key={a.id} className="door" {...doorLine(r, a.door, u(6))} strokeWidth={u(3)} />,
      )}

      {entrances.map((e) => (
        <g key={e.id}>
          <line className="door" x1={e.x - u(12)} y1={e.y} x2={e.x + u(12)} y2={e.y} strokeWidth={u(5)} />
          {e.youAreHere && (
            <>
              <line className="stroke" x1={e.x} y1={e.y + u(26)} x2={e.x} y2={e.y + u(6)} strokeWidth={u(2)} />
              <path className="ink" d={`M${e.x} ${e.y + u(3)} l${-u(5)} ${u(8)} h${u(10)}z`} />
              <rect className="ink" x={e.x - u(4)} y={e.y + u(22)} width={u(8)} height={u(8)} />
              <text className="label end" x={e.x - u(10)} y={e.y + u(30)} fontSize={u(LABEL_PX)}>
                You are here
              </text>
            </>
          )}
        </g>
      ))}

      {(map.paths ?? []).map((p) => {
        if (!p.label || p.points.length < 2) return null;
        const [[x1, y1], [x2, y2]] = p.points;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 + 40;
        return (
          <text
            key={p.id}
            className="path-label"
            x={mx}
            y={my}
            dy="0.35em"
            fontSize={u(PATH_LABEL_PX)}
            transform={x1 === x2 ? `rotate(-90 ${mx} ${my})` : undefined}
          >
            {p.label}
          </text>
        );
      })}

      {(map.symbols ?? []).map((s) =>
        s.kind === 'tree' ? (
          <g key={`${s.kind}-${s.x}-${s.y}`}>
            <line className="stroke" x1={s.x} y1={s.y + u(2)} x2={s.x} y2={s.y + u(9)} strokeWidth={u(1.5)} />
            <circle className="tree" cx={s.x} cy={s.y - u(2)} r={u(6)} strokeWidth={u(1.2)} />
          </g>
        ) : s.kind === 'noticeboard' ? (
          <rect
            key={`${s.kind}-${s.x}-${s.y}`}
            className="ink"
            x={s.x - u(9)}
            y={s.y - u(2)}
            width={u(18)}
            height={u(4)}
          />
        ) : null,
      )}

      {areas.map((a) => {
        const r = rectOf(a);
        return a.label && r ? <AreaLabel key={a.id} text={a.label} r={r} unit={unit} /> : null;
      })}
      {map.landmarks.map((l) => {
        const area = l.area ? byId.get(l.area) : undefined;
        const r = area && rectOf(area);
        if (r) return <AreaLabel key={l.id} text={l.label} r={r} unit={unit} />;
        if (l.symbol)
          return (
            <text key={l.id} className="label halo" x={l.x} y={l.y + u(13)} fontSize={u(LABEL_PX)} strokeWidth={u(3)}>
              {l.label}
            </text>
          );
        const e = l.entrance ? entrances.find((x) => x.id === l.entrance) : undefined;
        if (e)
          return (
            <text key={l.id} className="label start" x={e.x + u(12)} y={e.y + u(30)} fontSize={u(LABEL_PX)}>
              {l.label}
            </text>
          );
        return null; // linked to a path: a junction, not labelled on the map
      })}

      {map.compass && (
        <g>
          <line
            className="stroke"
            x1={map.compass.x}
            y1={map.compass.y + u(14)}
            x2={map.compass.x}
            y2={map.compass.y - u(14)}
            strokeWidth={u(2)}
          />
          <path className="ink" d={`M${map.compass.x} ${map.compass.y - u(17)} l${-u(5)} ${u(9)} h${u(10)}z`} />
          <text className="label bold" x={map.compass.x} y={map.compass.y - u(21)} fontSize={u(11)}>
            N
          </text>
        </g>
      )}

      {under}
      {map.targets.map((t) => (
        <g key={t.label} className={t.label === picked ? 'letter-box picked' : 'letter-box'}>
          <rect
            x={t.x - u(BOX_PX) / 2}
            y={t.y - u(BOX_PX) / 2}
            width={u(BOX_PX)}
            height={u(BOX_PX)}
            strokeWidth={u(1.5)}
          />
          <text x={t.x} y={t.y} dy="0.36em" fontSize={u(LETTER_PX)}>
            {t.label}
          </text>
        </g>
      ))}
    </g>
  );
}
