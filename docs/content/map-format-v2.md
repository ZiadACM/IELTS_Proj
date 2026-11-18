# Content format v2: maps (proposal)

Status: **Proposed**, 2026-11-18. Ticket: `.scratch/map-format-v2/issues/01-map-format-v2.md`. Background: `docs/content/map-reference-guide.md`. Worked example: `.scratch/map-format-v2/first-challenge-001.v2.json`.

## Why

Format v1 draws a map as small squares (landmarks) and lettered discs (targets) on blank paper. Real exam maps are drawings: paths, rooms, water, trees, a compass and a start point, with the letters inside unnamed places. Learners have to read the drawing to follow the speaker. v2 adds the drawing and keeps everything else.

## Rules of the change

- **Additive.** v2 only adds fields inside `map`. `landmarks[]` and `targets[]` keep their v1 fields (`id`, `label`, `x`, `y`), so the route, hints and Answer Replay keep working, and a v2 item already passes the v1 validator (checked on the worked example).
- `map.format: 2` marks a v2 map. Without it, the player draws v1 as today.
- Everything is plain data: no SVG, no paths as strings, no styling. The player decides how things look.
- Coordinates are map units, origin top left, inside `width` x `height`, as in v1.

## The `map` object

```jsonc
"map": {
  "format": 2,
  "width": 1000, "height": 900,
  "title": "Riverside Community Centre",            // optional, shown above the map
  "compass": { "x": 50, "y": 760, "north": 0 },       // required when the transcript uses north/south/east/west
  "areas": [                                         // drawn first, in this order
    { "id": "building", "kind": "building", "rect": [100, 20, 880, 800] },
    { "id": "store", "kind": "room", "rect": [100, 165, 165, 105], "label": "Store", "door": { "side": "e" } },
    { "id": "room-c", "kind": "room", "rect": [850, 585, 130, 235], "door": { "side": "n" } },
    { "id": "lake", "kind": "water", "polygon": [[x, y], ...], "label": "Lake" }
  ],
  "paths": [
    { "id": "main-hall", "kind": "corridor", "label": "Main hall", "width": 60, "points": [[510, 820], [510, 560]] }
  ],
  "entrances": [ { "id": "main-door", "kind": "main", "x": 510, "y": 820, "side": "s", "youAreHere": true } ],
  "symbols":   [ { "kind": "tree", "x": 50, "y": 110 }, { "kind": "noticeboard", "x": 510, "y": 540 } ],
  "landmarks": [
    { "id": "reception", "label": "Reception", "x": 640, "y": 762, "area": "reception" },
    { "id": "noticeboard", "label": "Noticeboard", "x": 510, "y": 545, "symbol": "noticeboard" },
    { "id": "main-entrance", "label": "Main entrance", "x": 510, "y": 840, "entrance": "main-door" },
    { "id": "corridor-junction", "label": "Corridor junction", "x": 290, "y": 190, "path": "cross-corridor" }
  ],
  "targets": [ { "label": "C", "x": 915, "y": 702, "area": "room-c" } ]
}
```

| Field | Meaning |
|---|---|
| `areas[]` | Filled shapes. `kind`: `building`, `room`, `water`, `grass`, `car-park`, `courtyard`, `field`. Shape is `rect` `[x, y, w, h]` or `polygon` (3 or more points). Optional `label` (written inside), optional `door` `{ side: n/e/s/w, at? }` for rooms (a gap in the wall; `at` is the position along that side, default the middle). |
| `paths[]` | Walkable lines. `kind`: `corridor`, `road`, `path`, `footpath` (dashed), `covered-walkway` (dashed), `river`, `railway`. `points` is a polyline, `width` its drawn width in map units, optional `label` written along it. |
| `entrances[]` | Doors and gates in a boundary. `kind`: `main`, `door`, `gate`. `side` says which way it faces. `youAreHere: true` draws the start mark (at most one per map). |
| `symbols[]` | Point drawings from a fixed list: `tree`, `noticeboard`, `information-board`, `bench`, `toilets`, `stairs`, `cafe`, `bridge`, `parking`. A symbol kind the player cannot label by itself is listed in a key, which the player builds. |
| `compass` | Position and `north` in degrees clockwise from up (only `0` allowed at first). Drawn as a north arrow on phones. |
| `landmarks[]` | As v1, plus **one** link that says how the landmark is drawn: `area` (its label goes inside that area, which must have no label of its own), `symbol`, `entrance` or `path`. A landmark linked to a `path` is a place on the route that is not labelled on the map (a junction): hints and replay still name it. |
| `targets[]` | As v1, plus optional `area`. Drawn as a **square letter box** (26 px side, 15 px bold letter, same size everywhere). A target with `area` sits inside that area, which must have no label: answer places are unnamed. |

## Route legs

Owner decisions D21 and D23. A route is split into **legs**, one per question, and every leg is a walk from an entrance:

- **One leg per question.** The first event starts leg 1; an event with `"startsLeg": true` starts each later leg. Each leg holds exactly one question's destination event.
- **Every leg starts at an entrance** (D23). A leg's first event is kind `move` with `landmarkId` naming its **anchor**: a landmark linked to an entrance (`"entrance": "<entrance id>"`). It is never a room or another landmark, and it never continues from the previous answer place. A building with one entrance starts every leg there; a map with several gates (for example a park with a north gate and a south gate) may start legs at different gates.
- **Every leg is walked** (D23). Each straight segment between two events stays on a path or corridor or goes through a room's door; no segment crosses a wall or a room. Authors add `move` events at corners and in front of doors. A destination is reached through its room's door. There are no pointing legs: the speaker may still describe the answer place with the rooms passed and compass words ("directly north of the staff office"), but the line walks there.
- **Timing words** (D23). Every event has `word`: the exact words in its cue (character for character) after which the line may reach that point. Within a cue, the events' words appear in event order. The voicing script writes `atSec`, the time in the final audio at which that phrase ends.
- **Answer Replay** starts the line over at each question; it never joins one leg to the next. During playback an event is drawn only once the audio reaches its `atSec` (without `atSec`, the end of its cue, never its start). Earlier legs fade, the current leg is bold, and each leg starts at a numbered ring. Each question can be replayed from the start of its own leg.
- `startsLeg`, `word` and `atSec` are extra fields on existing event kinds, so the v1 validator still accepts the item.
- Gone since D23: `fromAnswer` (a leg carrying on from the previous answer place) and `"how": "point"` (pointing legs).
- Open question for the owner: tier 1 **guided tour items** lead along one route past each answer place in order (D21). Under D23 their later legs would also start again at the entrance; whether a guided tour keeps one leg per question is not decided yet.
- Why: in real recordings each question starts again from a fixed point (reference guide, section 6). The owner's review of the prototype (D23): lines that start at a room, or point straight to the answer, cut through walls and rooms; lines drawn before the words are spoken give the answer away.

Example (the second leg of an anchored item, "Starting from the main entrance again, ..."):

```json
{ "id": "e6", "cueId": "c6", "kind": "move", "landmarkId": "main-entrance", "at": { "x": 500, "y": 840 }, "startsLeg": true, "word": "Starting from the main entrance again", "atSec": 38.12 }
```

## Validator rules for v2 (to add later, protected file, owner approval needed)

New codes, each with a failing fixture:
- `v2-shape`: unknown `kind`, a bad `rect` or `polygon`, a point outside the map, a duplicate id across areas, paths and entrances.
- `v2-ref`: a landmark or target links to a missing area, symbol, entrance or path, or a landmark has more than one link.
- `v2-inside`: a landmark or target with `area` is not inside that area.
- `v2-named-answer`: an answer target sits inside a labelled area, or inside a landmark's area.
- `v2-label-fit`: a label at 11 px does not fit its area with 4 px padding (two lines allowed) when the map is 326 px wide (D22).
- `v2-compass`: a transcript cue says north, south, east or west and the map has no compass.
- `v2-start`: a `youAreHere` entrance is more than 20 map units from the first route event.
- `v2-leg-start`: a leg's first event is not kind `move`; has no `landmarkId`; its anchor is not a landmark linked to an entrance; it has `fromAnswer` or `how`; or it is more than 20 map units from its anchor (D23).
- `v2-leg-question`: a leg holds no destination, or more than one.
- `v2-hint-leg`: a level 1 hint landmark is not on the same leg as the answer place, before it.
- `v2-word`: an event has no `word`; its `word` is not in its cue's text; or, within a cue, the events' words are not in event order (D23).
- `v2-at-time`: an event's `atSec` is outside its cue's `start` to `end`, or goes down from the previous event's (D23).
- `v2-route-walkable` (error, D23): a straight route segment between two events leaves every path and corridor without going through a room's door, or crosses a wall or a room. Authors fix it by adding `move` events at corners and doors.

The v1 rules all still apply, including `target-spacing`.

## Redraw of first-challenge-001 (worked example)

`.scratch/map-format-v2/first-challenge-001.v2.json` is a **historical redraw of the old recording**: it does not follow D23 (its legs start at the noticeboard and at an answer place, and it has no `word` times). The anchored draft that follows D23 is `.scratch/map-format-v2/first-challenge-001.anchored.json` (ticket 03).

It is the first-challenge item redrawn as a community-centre floor plan: 16 rooms, 4 corridors, the main entrance with "You are here", a noticeboard, trees in a side garden, and a north arrow.

Kept exactly (checked by script): audio, transcript cues and times, the 3 questions with answers C, F and H, hints, English and Arabic explanations, and every v1 event's id, kind, cue and order. Every direction in the recording still holds (reception to the right on entry, toilets opposite on the left, right at the noticeboard then the meeting room on the right, the Quiet Lounge at the far end on the right, left then right to head north, staff office on the left, Craft Room just past it, E opposite it, H on the east side after the junction).

Changed:
- **Coordinates.** The v1 points left rooms too small for their names on a phone, so all points moved. The map is now 1000 x 900 (was 700 tall).
- **Three corner points** (`m1`, `m3`, `m4`, kind `move`) keep the replay line inside the corridors.
- **Three legs, one per question.** Event e8 ("let's go back to the noticeboard") starts leg 2 at the noticeboard (`landmarkId`). Corner point m4 starts leg 3 at the Craft Room (`fromAnswer: "q2"`), because the recording carries on from there.
- **Still a guided tour.** Under D21 the first challenge (tier 2) should be an anchored item, so this item needs a rewrite (new script and audio) before it can follow the new rule; `fromAnswer` on leg 3 would fail `v2-leg-start`.
- **Three new names**, Store, Café and Kitchen, plus a Sports hall, fill the plan the way real maps do. None is mentioned in the recording.
- **Non-answer letters** A, B, D, E and G moved into their own unnamed rooms. D and C are 128 units apart (the minimum is 120 at 326 px).
- `version` is now 2, and `validation.status` is back to `draft`: the redraw needs the owner's content review before it replaces v1.

## Owner decisions (D22)

1. Map checks measure against **326 px**, the real map width on a 360 px phone (`.map-frame` in `web/src/app.css`). `v2-label-fit` uses the same width.
2. On phones the map **fits the screen width**; no zoom and pan.
3. **Portrait maps** are allowed: width 1000, height may exceed 1000.
4. The compass is **a north arrow** everywhere.
