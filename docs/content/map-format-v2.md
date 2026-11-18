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

A guided tour is not always one continuous walk. The speaker often goes back to a fixed point ("let's go back to the noticeboard", "starting from the entrance again") and sets off in a new direction. A route is therefore split into **legs**:

- **One leg per question** (owner decision D21). The first event starts leg 1; a `move` or `landmark` event with `"startsLeg": true` starts each later leg (`landmark` when the speaker names the anchor as a place to find). Each leg holds exactly one question's destination event.
- A leg start names its **anchor**: `landmarkId` (the speaker goes back to a named place, the start point included), or, in tier 1 guided tours only, `"fromAnswer": "<question id>"` (the speaker carries on from the previous answer place).
- `"how": "point"` on a leg start makes it a **pointing leg**: the speaker names the anchor and a relation instead of walking. A pointing leg has the anchor, the destination, and between them only `correction` or `distractor` events (the replay frames the place named by mistake). The default is `"walk"`.
- Answer Replay starts the line over at each question: it never joins one leg to the next. Walked legs are a solid line along the route; pointing legs are a dashed arrow from the anchor to the answer place. During playback earlier legs fade, the current leg is bold, and each leg starts at a numbered ring. Each question can be replayed from the start of its own leg.
- `startsLeg` is an extra field on an existing event kind, so the v1 validator still accepts the item.
- Why: in real recordings each question starts again from the start point or a named landmark, and most are described, not walked (reference guide, section 6).

Example (first-challenge-001, event e8 for cue c10, "OK, let's go back to the noticeboard"):

```json
{ "id": "e8", "cueId": "c10", "kind": "move", "at": { "x": 510, "y": 560 }, "landmarkId": "noticeboard", "startsLeg": true }
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
- `v2-leg-start`: a `startsLeg` event is not kind `move` or `landmark`; names neither `landmarkId` nor `fromAnswer` (or both); uses `fromAnswer` on a tier 2 or 3 item; or is more than 20 map units from its anchor.
- `v2-leg-question`: a leg holds no destination, or more than one.
- `v2-point-leg`: a pointing leg has events other than its anchor, its destination, and `correction` or `distractor` events.
- `v2-hint-leg`: a level 1 hint landmark is not on the same leg as the answer place, before it (for a pointing leg, the anchor itself).
- `v2-route-walkable` (warning at first): a straight route segment between two events leaves every path and crosses a room wall. Authors fix it by adding `move` events at corners.

The v1 rules all still apply, including `target-spacing`.

## Redraw of first-challenge-001 (worked example)

`.scratch/map-format-v2/first-challenge-001.v2.json` is the first-challenge item redrawn as a community-centre floor plan: 16 rooms, 4 corridors, the main entrance with "You are here", a noticeboard, trees in a side garden, and a north arrow.

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
