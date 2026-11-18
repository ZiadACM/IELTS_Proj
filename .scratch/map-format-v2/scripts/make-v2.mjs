// Builds the v2 redraw of first-challenge-001 from the v1 item: everything except map and event points is copied.
import { readFileSync, writeFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
const v1 = JSON.parse(readFileSync(src, 'utf8'));
const room = (id, rect, extra = {}) => ({ id, kind: 'room', rect, ...extra });
const map = {
  format: 2,
  width: 1000,
  height: 900,
  title: 'Riverside Community Centre',
  compass: { x: 50, y: 760, north: 0 },
  areas: [
    { id: 'garden', kind: 'grass', rect: [0, 20, 100, 640] },
    { id: 'building', kind: 'building', rect: [100, 20, 880, 800] },
    room('room-g', [100, 20, 165, 145], { door: { side: 'e' } }),
    room('store', [100, 165, 165, 105], { label: 'Store', door: { side: 'e' } }),
    room('room-f', [100, 270, 165, 130], { door: { side: 'e' } }),
    room('staff-office', [100, 400, 165, 185], { door: { side: 'e' } }),
    room('room-b', [100, 585, 200, 235], { door: { side: 'n', at: 283 } }), // at the corridor corner; the middle of the wall would open into the staff office
    room('toilets', [300, 585, 170, 235], { door: { side: 'n' } }),
    room('room-h', [315, 20, 155, 145], { door: { side: 'w' } }),
    room('cafe', [315, 215, 155, 185], { label: 'Café', door: { side: 'w' } }),
    room('room-e', [315, 400, 155, 135], { door: { side: 'w' } }),
    room('sports-hall', [470, 20, 510, 380], { label: 'Sports hall', door: { side: 'w', at: 190 } }),
    room('room-a', [470, 400, 270, 135], { door: { side: 's' } }),
    room('kitchen', [740, 400, 240, 135], { label: 'Kitchen', door: { side: 's' } }),
    room('meeting-room', [530, 585, 220, 125], { door: { side: 'n' } }),
    room('reception', [530, 710, 220, 110], { door: { side: 'w' } }),
    room('room-d', [750, 585, 115, 235], { door: { side: 'n' } }),
    room('room-c', [865, 585, 115, 235], { door: { side: 'n' } }),
  ],
  paths: [
    { id: 'main-hall', kind: 'corridor', label: 'Main hall', width: 60, points: [[500, 820], [500, 560]] },
    { id: 'east-corridor', kind: 'corridor', width: 50, points: [[500, 560], [980, 560]] },
    { id: 'west-corridor', kind: 'corridor', width: 50, points: [[500, 560], [290, 560], [290, 20]] },
    { id: 'cross-corridor', kind: 'corridor', width: 50, points: [[290, 190], [470, 190]] },
  ],
  entrances: [{ id: 'main-door', kind: 'main', x: 500, y: 820, side: 's', youAreHere: true }],
  symbols: [
    { kind: 'noticeboard', x: 500, y: 540 },
    { kind: 'tree', x: 50, y: 110 }, { kind: 'tree', x: 50, y: 260 },
    { kind: 'tree', x: 50, y: 410 }, { kind: 'tree', x: 50, y: 560 },
  ],
  landmarks: [
    { id: 'main-entrance', label: 'Main entrance', x: 500, y: 840, entrance: 'main-door' },
    { id: 'reception', label: 'Reception', x: 640, y: 765, area: 'reception' },
    { id: 'toilets', label: 'Toilets', x: 385, y: 702, area: 'toilets' },
    { id: 'noticeboard', label: 'Noticeboard', x: 500, y: 545, symbol: 'noticeboard' },
    { id: 'meeting-room', label: 'Meeting room', x: 640, y: 647, area: 'meeting-room' },
    { id: 'staff-office', label: 'Staff office', x: 182, y: 492, area: 'staff-office' },
    { id: 'corridor-junction', label: 'Corridor junction', x: 290, y: 190, path: 'cross-corridor' },
  ],
  targets: [
    { label: 'A', x: 605, y: 467, area: 'room-a' },
    { label: 'B', x: 200, y: 702, area: 'room-b' },
    { label: 'C', x: 933, y: 702, area: 'room-c' },
    { label: 'D', x: 805, y: 702, area: 'room-d' },
    { label: 'E', x: 392, y: 467, area: 'room-e' },
    { label: 'F', x: 182, y: 335, area: 'room-f' },
    { label: 'G', x: 182, y: 92, area: 'room-g' },
    { label: 'H', x: 392, y: 92, area: 'room-h' },
  ],
};
// New route points: same events, same cues, same order; corner "move" points keep the line inside the corridors.
const at = { e1: [500, 840], e2: [500, 770], e3: [500, 740], e4: [500, 560], e5: [500, 560], e6: [640, 560], e7: [933, 702],
  e8: [500, 560], e9: [500, 560], e10: [290, 560], e11: [290, 492], e12: [182, 335], e13: [290, 190], e14: [290, 92], e15: [392, 92] };
const corners = { e7: ['m1', 'c9', [933, 560]], e12: ['m3', 'c12', [290, 335]], e13: ['m4', 'c13', [290, 335]] };
const events = [];
for (const e of v1.events) {
  if (corners[e.id]) {
    const [id, cueId, [x, y]] = corners[e.id];
    const corner = { id, cueId, kind: 'move', at: { x, y } };
    // Question 3's leg: the recording carries on from the Craft Room (q2's answer place), so the leg starts there.
    if (id === 'm4') Object.assign(corner, { startsLeg: true, fromAnswer: 'q2' });
    events.push(corner);
  }
  const event = { ...e, at: { x: at[e.id][0], y: at[e.id][1] } };
  // The speaker goes back to the noticeboard: a new leg starts there, so the replay lifts the pen instead of walking back.
  if (e.id === 'e8') Object.assign(event, { landmarkId: 'noticeboard', startsLeg: true });
  events.push(event);
}
const v2 = { ...v1, version: v1.version + 1, map, events, validation: { status: 'draft' } };
writeFileSync(out, JSON.stringify(v2, null, 2) + '\n');
