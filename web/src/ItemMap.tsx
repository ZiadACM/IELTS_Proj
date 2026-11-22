// The item's map. A v2 map (`format: 2`) is drawn by MapV2 as a floor plan; a v1 map as below.
// v1: landmarks as small labelled squares, lettered places as large discs (size carries the hierarchy, not
// colour). Map content is English and stays left-to-right inside the Arabic frame. Text is sized in screen pixels, so
// labels stay readable on a 360 px phone without pinch-zoom.
import { type MouseEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MapData } from './api.ts';
import { MapV2 } from './MapV2.tsx';
import { ReplayLayer } from './ReplayLayer.tsx';
import type { ReplayView } from './replay.ts';

const LABEL_PX = 12;
const LETTER_PX = 15;
const DISC_PX = 15; // radius: a 30 px disc
const SQUARE_PX = 8;
const PICK_RADIUS_PX = 22; // a tap this close to a letter picks it: a 44 px target (CS 4.3) unless letters are closer
const MARGIN = 40; // map units around the edge, so labels near it are not cut
const LABEL_FONT = `${LABEL_PX}px system-ui, "Segoe UI", sans-serif`; // matches .item-map .landmark text
// matches .review-marks .yours-tag text (the UI face, which has Arabic)
const TAG_FONT = `700 ${LABEL_PX}px system-ui, "Segoe UI", "Noto Sans Arabic", "Geeza Pro", sans-serif`;

type Box = { x1: number; y1: number; x2: number; y2: number };
type Anchor = 'start' | 'middle' | 'end';
type Placed = { x: number; y: number; anchor: Anchor; lines: string[] };
const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));

// A label's width in screen pixels, measured with the font it is drawn in (an estimate where canvas is missing).
let measureContext: CanvasRenderingContext2D | null | undefined;
function labelWidthPx(text: string, font = LABEL_FONT) {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return text.length * 0.6 * LABEL_PX;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

// A label on one line, and for a label of several words, also split in two: a narrower block fits a crowded spot.
function layouts(label: string) {
  const words = label.split(' ');
  const options = [[label]];
  if (words.length > 1) {
    const middle = Math.ceil(words.length / 2);
    options.push([words.slice(0, middle).join(' '), words.slice(middle).join(' ')]);
  }
  return options;
}

// Puts each landmark label beside its square: below, above, after, before, then the four corners, on one line first
// and then on two. It takes the first
// spot inside the map that touches no letter disc, no square and no label already placed. When none is free, it takes
// the spot that overlaps least, where covering a letter disc costs far more than touching a label: a covered letter is
// a wrong answer, a crowded label is only harder to read. `unit` is map units per screen pixel.
function placeLabels(map: MapData, unit: number): Placed[] {
  const disc = DISC_PX * unit + 2 * unit;
  const half = (SQUARE_PX * unit) / 2;
  // A label keeps a clear margin from every other landmark's square, so it cannot be read as that landmark's label.
  const halo = half + 8 * unit;
  const squares = map.landmarks.map((l) => ({ x1: l.x - halo, y1: l.y - halo, x2: l.x + halo, y2: l.y + halo }));
  const discs = map.targets.map((t) => ({ x1: t.x - disc, y1: t.y - disc, x2: t.x + disc, y2: t.y + disc }));
  const labels: Box[] = [];
  const bounds = { x1: -MARGIN, y1: -MARGIN, x2: map.width + MARGIN, y2: map.height + MARGIN };
  const inside = (b: Box) => b.x1 >= bounds.x1 && b.x2 <= bounds.x2 && b.y1 >= bounds.y1 && b.y2 <= bounds.y2;
  const lineHeight = LABEL_PX * 1.2 * unit;
  const gap = 3 * unit;
  return map.landmarks.map((l, index) => {
    const otherSquares = squares.filter((_, i) => i !== index);
    const options = layouts(l.label).flatMap((lines) => {
      const width = Math.max(...lines.map((line) => labelWidthPx(line))) * unit;
      const height = lines.length * lineHeight;
      const below = l.y + half + gap;
      const above = l.y - half - gap - height;
      const spots: [number, number, Anchor][] = [
        [l.x, below, 'middle'],
        [l.x, above, 'middle'],
        [l.x + half + gap, l.y - height / 2, 'start'],
        [l.x - half - gap, l.y - height / 2, 'end'],
        [l.x - half, below, 'start'],
        [l.x + half, below, 'end'],
        [l.x - half, above, 'start'],
        [l.x + half, above, 'end'],
      ];
      return spots.map(([x, y, anchor]) => {
        const x1 = anchor === 'middle' ? x - width / 2 : anchor === 'start' ? x : x - width;
        return { x, y, anchor, lines, box: { x1, y1: y, x2: x1 + width, y2: y + height } };
      });
    });
    const cost = (box: Box, boxes: Box[], weight: number) =>
      weight * boxes.reduce((sum, b) => sum + overlapArea(box, b), 0);
    const clash = (box: Box) => cost(box, discs, 100) + cost(box, otherSquares, 10) + cost(box, labels, 1);
    const fitting = options.filter((o) => inside(o.box));
    const chosen =
      fitting.find((o) => clash(o.box) === 0) ??
      (fitting.length ? fitting : options).reduce((best, o) => (clash(o.box) < clash(best.box) ? o : best));
    labels.push(chosen.box);
    // `y` is the top of the box; text is drawn from its baseline.
    return { x: chosen.x, y: chosen.y + LABEL_PX * unit, anchor: chosen.anchor, lines: chosen.lines };
  });
}

// Review marks for one question (ticket 09). The correct letter gets a heavy frame and a tick; the learner's letter a
// dashed frame and a tag naming it. Shape and words carry the difference, not colour alone (CS 4.4). When the learner
// was right, one letter carries both.
export type ReviewMarks = { yours: string | null; correct: string; yoursTag: string };
const V1_HALF_PX = DISC_PX; // half the size of a letter: disc radius (v1) or half the box (v2, 26 px box)
const V2_HALF_PX = 13;

const boxAt = (cx: number, cy: number, w: number, h: number): Box => ({
  x1: cx - w / 2,
  y1: cy - h / 2,
  x2: cx + w / 2,
  y2: cy + h / 2,
});
// The candidate with the least weighted overlap with what is already drawn; the first that touches nothing wins.
type Drawn = Box & { weight: number };
const leastCovering = (candidates: Box[], drawn: Drawn[]) =>
  candidates.reduce(
    (best, box, i) => {
      const cost = drawn.reduce((sum, d) => sum + d.weight * overlapArea(box, d), 0);
      return cost < best.cost ? { i, cost } : best;
    },
    { i: 0, cost: Number.POSITIVE_INFINITY },
  ).i;

function Marks({ map, unit, marks }: { map: MapData; unit: number; marks: ReviewMarks }) {
  const u = (px: number) => px * unit;
  const at = (label: string | null) => map.targets.find((t) => t.label === label);
  const correct = at(marks.correct);
  const yours = at(marks.yours);
  const half = u(map.format === 2 ? V2_HALF_PX : V1_HALF_PX);
  const group = useRef<SVGGElement>(null);

  // The tick sits on a corner of the correct letter and the tag on a side of the learner's letter: the first corner and
  // side that cover no landmark name and no other letter, read from what the map actually drew (critique, 2026-11-19).
  const tickR = u(9);
  const tickAt = correct
    ? [
        [1, -1],
        [-1, -1],
        [1, 1],
        [-1, 1],
      ].map(([dx, dy]) => ({ x: correct.x + dx * (half + u(4)), y: correct.y + dy * (half + u(4)) }))
    : [];
  const tagW = labelWidthPx(marks.yoursTag, TAG_FONT) * unit + u(12);
  const tagH = u(18);
  const gap = u(yours === correct ? 16 : 18);
  const tagAt = yours
    ? [
        { x: yours.x, y: yours.y + half + gap },
        { x: yours.x, y: yours.y - half - gap },
        { x: yours.x + half + u(10) + tagW / 2, y: yours.y },
        { x: yours.x - half - u(10) - tagW / 2, y: yours.y },
      ]
    : [];
  const [place, setPlace] = useState({ tick: 0, tag: 0 });
  const placeKey = `${marks.correct}|${marks.yours}|${unit}|${marks.yoursTag}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: placeKey names every input of the candidate positions
  useLayoutEffect(() => {
    const svg = group.current?.ownerSVGElement;
    if (!svg) return;
    // Covering a landmark name or a letter hides content (weight 10); standing close to a marked letter's frame only
    // risks the tag reading as naming that letter (weight 1).
    const drawn: Drawn[] = [];
    for (const text of svg.querySelectorAll<SVGTextElement>('text')) {
      if (group.current?.contains(text)) continue;
      const b = text.getBBox();
      drawn.push({ x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height, weight: 10 });
    }
    for (const t of map.targets) drawn.push({ ...boxAt(t.x, t.y, 2 * half, 2 * half), weight: 10 });
    // The marked letters' frames, with a margin, so the tag cannot read as naming the other letter.
    for (const t of [correct, yours])
      if (t) drawn.push({ ...boxAt(t.x, t.y, 2 * (half + u(12)), 2 * (half + u(12))), weight: 1 });
    const tick = leastCovering(
      tickAt.map((p) => boxAt(p.x, p.y, 2 * tickR, 2 * tickR)),
      drawn,
    );
    if (tickAt[tick]) drawn.push({ ...boxAt(tickAt[tick].x, tickAt[tick].y, 2 * tickR, 2 * tickR), weight: 10 });
    const tag = leastCovering(
      tagAt.map((p) => boxAt(p.x, p.y, tagW, tagH)),
      drawn,
    );
    setPlace((now) => (now.tick === tick && now.tag === tag ? now : { tick, tag }));
  }, [placeKey]);

  const frame = (x: number, y: number, pad: number, className: string) =>
    map.format === 2 ? (
      <rect
        className={className}
        x={x - half - pad}
        y={y - half - pad}
        width={2 * (half + pad)}
        height={2 * (half + pad)}
      />
    ) : (
      <circle className={className} cx={x} cy={y} r={half + pad} />
    );
  const tick = tickAt[place.tick] ?? tickAt[0];
  const tag = tagAt[place.tag] ?? tagAt[0];
  return (
    <g ref={group} className="review-marks" strokeWidth={u(3)}>
      {yours && yours !== correct && frame(yours.x, yours.y, u(6), 'yours-frame')}
      {correct && tick && (
        <>
          {frame(correct.x, correct.y, u(4), 'correct-frame')}
          <g className="tick" transform={`translate(${tick.x} ${tick.y})`}>
            <circle r={tickR} strokeWidth={u(2)} />
            <path d={`M${-u(4)} ${u(0.5)}l${u(2.8)} ${u(2.8)}l${u(5.2)} ${-u(5.6)}`} strokeWidth={u(2)} />
          </g>
        </>
      )}
      {yours && tag && (
        <g className="yours-tag">
          <rect className="tag" x={tag.x - tagW / 2} y={tag.y - tagH / 2} width={tagW} height={tagH} rx={u(3)} />
          <text className="tag" x={tag.x} y={tag.y} dy="0.35em" fontSize={u(LABEL_PX)}>
            {marks.yoursTag}
          </text>
        </g>
      )}
    </g>
  );
}

// Answer Replay at one moment (ticket 10): shown instead of the review marks once the replay has started.
export type ReplayOnMap = { view: ReplayView; answers: string[] };

// `picked` is the letter shown as chosen. With `onPick`, a tap or click near a letter picks it. Tapping is for
// pointers only: the question list's letter choice is the keyboard and screen reader path (spec: Accessibility).
export function ItemMap({
  map,
  label,
  picked,
  onPick,
  marks,
  replay,
}: {
  map: MapData;
  label: string;
  picked?: string;
  onPick?: (letter: string) => void;
  marks?: ReviewMarks;
  replay?: ReplayOnMap;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const viewWidth = map.width + 2 * MARGIN;
  // Map units per screen pixel; before the first measurement, assume a phone-width map.
  const unit = viewWidth / (width || 360);
  const v2 = map.format === 2;
  const labels = v2 ? [] : placeLabels(map, unit);

  // The letter nearest the tap, if it is within reach. Nearest wins, so two close letters never both claim a tap.
  const pick = (event: MouseEvent<SVGSVGElement>) => {
    const toMap = ref.current?.getScreenCTM()?.inverse();
    if (!onPick || !toMap) return;
    const at = new DOMPoint(event.clientX, event.clientY).matrixTransform(toMap);
    const reach = PICK_RADIUS_PX * unit;
    let nearest: { label: string; distance: number } | null = null;
    for (const t of map.targets) {
      const distance = Math.hypot(t.x - at.x, t.y - at.y);
      if (distance <= reach && (!nearest || distance < nearest.distance)) nearest = { label: t.label, distance };
    }
    if (nearest) onPick(nearest.label);
  };

  return (
    <>
      {v2 && map.title && (
        <p className="map-title" lang="en" dir="ltr">
          {map.title}
        </p>
      )}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: tapping the map is a pointer shortcut; the keyboard answers with each question's letter list (spec: Accessibility). */}
      <svg
        ref={ref}
        className={onPick ? 'item-map pickable' : 'item-map'}
        viewBox={`${-MARGIN} ${-MARGIN} ${viewWidth} ${map.height + 2 * MARGIN}`}
        role="img"
        aria-label={label}
        direction="ltr"
        lang="en"
        onClick={onPick && pick}
      >
        {v2 ? (
          <MapV2
            map={map}
            unit={unit}
            picked={picked}
            under={replay && <ReplayLayer layer="under" map={map} unit={unit} {...replay} />}
          />
        ) : (
          <V1Map
            map={map}
            unit={unit}
            labels={labels}
            picked={picked}
            under={replay && <ReplayLayer layer="under" map={map} unit={unit} {...replay} />}
          />
        )}
        {replay ? (
          <ReplayLayer layer="over" map={map} unit={unit} {...replay} />
        ) : (
          marks && <Marks map={map} unit={unit} marks={marks} />
        )}
      </svg>
    </>
  );
}

function V1Map({
  map,
  unit,
  labels,
  picked,
  under,
}: {
  map: MapData;
  unit: number;
  labels: Placed[];
  picked?: string;
  under?: ReactNode;
}) {
  return (
    <>
      {under}
      {map.landmarks.map((l) => (
        <rect
          key={l.id}
          className="landmark-mark"
          x={l.x - (SQUARE_PX * unit) / 2}
          y={l.y - (SQUARE_PX * unit) / 2}
          width={SQUARE_PX * unit}
          height={SQUARE_PX * unit}
        />
      ))}
      {map.targets.map((t) => (
        <g key={t.label} className={t.label === picked ? 'target picked' : 'target'}>
          <circle cx={t.x} cy={t.y} r={DISC_PX * unit} strokeWidth={2 * unit} />
          <text x={t.x} y={t.y} dy="0.35em" fontSize={LETTER_PX * unit}>
            {t.label}
          </text>
        </g>
      ))}
      {/* Labels last, with a halo, so one that has to touch a disc on a crowded small map stays readable. */}
      {map.landmarks.map((l, i) => (
        <text
          key={l.id}
          className="landmark-label"
          x={labels[i].x}
          y={labels[i].y}
          textAnchor={labels[i].anchor}
          fontSize={LABEL_PX * unit}
          strokeWidth={3 * unit}
        >
          {labels[i].lines.map((line, n) => (
            <tspan key={line} x={labels[i].x} dy={n === 0 ? 0 : LABEL_PX * 1.2 * unit}>
              {line}
            </tspan>
          ))}
        </text>
      ))}
    </>
  );
}
