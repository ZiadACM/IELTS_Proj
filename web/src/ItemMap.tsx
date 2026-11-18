// The item's map: landmarks as small labelled squares, lettered places as large discs (size carries the hierarchy, not
// colour). Map content is English and stays left-to-right inside the Arabic frame. Text is sized in screen pixels, so
// labels stay readable on a 360 px phone without pinch-zoom.
import { useEffect, useRef, useState } from 'react';
import type { MapData } from './api.ts';

const LABEL_PX = 12;
const LETTER_PX = 15;
const DISC_PX = 15; // radius: a 30 px disc
const SQUARE_PX = 8;
const MARGIN = 40; // map units around the edge, so labels near it are not cut
const LABEL_FONT = `${LABEL_PX}px system-ui, "Segoe UI", sans-serif`; // matches .item-map .landmark text

type Box = { x1: number; y1: number; x2: number; y2: number };
type Placed = { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
const overlapArea = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));

// A label's width in screen pixels, measured with the font it is drawn in (an estimate where canvas is missing).
let measureContext: CanvasRenderingContext2D | null | undefined;
function labelWidthPx(text: string) {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return text.length * 0.56 * LABEL_PX;
  measureContext.font = LABEL_FONT;
  return measureContext.measureText(text).width;
}

// Puts each landmark label beside its square: below, above, after, before, then the four corners. It takes the first
// spot inside the map that touches no letter disc, no square and no label already placed; when none is free, the spot
// that overlaps least. `unit` is map units per screen pixel.
function placeLabels(map: MapData, unit: number): Placed[] {
  const disc = DISC_PX * unit + 2 * unit;
  const half = (SQUARE_PX * unit) / 2;
  // A label keeps a clear margin from every other landmark's square, so it cannot be read as that landmark's label.
  const halo = half + 8 * unit;
  const squares = map.landmarks.map((l) => ({ x1: l.x - halo, y1: l.y - halo, x2: l.x + halo, y2: l.y + halo }));
  const taken: Box[] = map.targets.map((t) => ({ x1: t.x - disc, y1: t.y - disc, x2: t.x + disc, y2: t.y + disc }));
  const bounds = { x1: -MARGIN, y1: -MARGIN, x2: map.width + MARGIN, y2: map.height + MARGIN };
  const inside = (b: Box) => b.x1 >= bounds.x1 && b.x2 <= bounds.x2 && b.y1 >= bounds.y1 && b.y2 <= bounds.y2;
  const height = LABEL_PX * 1.2 * unit;
  const gap = 3 * unit;
  return map.landmarks.map((l, index) => {
    const others = [...taken, ...squares.filter((_, i) => i !== index)];
    const width = labelWidthPx(l.label) * unit;
    const below = l.y + half + gap;
    const above = l.y - half - gap - height;
    const options: (Placed & { box: Box })[] = (
      [
        { x: l.x, y: below, anchor: 'middle' },
        { x: l.x, y: above, anchor: 'middle' },
        { x: l.x + half + gap, y: l.y - height / 2, anchor: 'start' },
        { x: l.x - half - gap, y: l.y - height / 2, anchor: 'end' },
        { x: l.x - half, y: below, anchor: 'start' },
        { x: l.x + half, y: below, anchor: 'end' },
        { x: l.x - half, y: above, anchor: 'start' },
        { x: l.x + half, y: above, anchor: 'end' },
      ] as Placed[]
    ).map((o) => {
      const x1 = o.anchor === 'middle' ? o.x - width / 2 : o.anchor === 'start' ? o.x : o.x - width;
      return { ...o, box: { x1, y1: o.y, x2: x1 + width, y2: o.y + height } };
    });
    const clash = (box: Box) => others.reduce((sum, b) => sum + overlapArea(box, b), 0);
    const fitting = options.filter((o) => inside(o.box));
    const chosen =
      fitting.find((o) => clash(o.box) === 0) ??
      (fitting.length ? fitting : options).reduce((best, o) => (clash(o.box) < clash(best.box) ? o : best));
    taken.push(chosen.box);
    // `y` is the top of the box; text is drawn from its baseline.
    return { x: chosen.x, y: chosen.y + LABEL_PX * unit, anchor: chosen.anchor };
  });
}

export function ItemMap({ map, label }: { map: MapData; label: string }) {
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
  const labels = placeLabels(map, unit);

  return (
    <svg
      ref={ref}
      className="item-map"
      viewBox={`${-MARGIN} ${-MARGIN} ${viewWidth} ${map.height + 2 * MARGIN}`}
      role="img"
      aria-label={label}
      direction="ltr"
      lang="en"
    >
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
        <g key={t.label} className="target">
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
          {l.label}
        </text>
      ))}
    </svg>
  );
}
