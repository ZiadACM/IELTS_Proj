# Listening map reference guide

Status: draft, 2026-11-18. Written in our own words from 17 reference images of real IELTS Listening map questions kept in `docs/content/images/`. Those images are third-party copyright: they stay on the owner's machine, are gitignored, and are **never committed, copied, traced or quoted**. This guide records patterns only; no map, place name set or question list from them is reproduced. Items we write must use their own places, layouts and names.

Of the 17 files, 15 are distinct maps: two show the same town map at different sizes, and the small `.webp` is the same park map as one of the PNGs.

## 1. Map types

| Type | Count | What it shows | Typical start point |
|---|---|---|---|
| Outdoor site or park | 7 | A bounded area with curving paths, water (lake, river, pond), trees, a few named features | A gate or "You are here" on the bottom edge |
| Town streets | 3 | Named roads drawn as double lines, labelled buildings as boxes beside them | A road junction or entrance arrow |
| Building complex (site plan) | 4 | Separate buildings or a block of rooms, a car park, an access road | Reception, a main road or a car park |
| Indoor floor plan | 1 | One building drawn like an architect's plan: thick walls, door swings, windows, stairs, furniture | "Entrance" on the bottom wall |

Answer format seen:
- **Letter matching** (12 of 15 maps): the map shows lettered places and a grid lists the place names; the learner picks a letter for each name. This is our format.
- **Numbered places** (1 map): the rooms carry numbers instead of letters.
- **Word gap fill** (2 maps): numbered blanks with dotted lines on the map, and the learner writes up to two words. Not in our first release.

## 2. Parts of a map

- **Boundary**: a frame around the site, often with roads, rivers or fields drawn just outside it.
- **Paths**: double lines for roads, paths and corridors; dashed lines for footpaths or covered walkways (usually explained in a small key). Road and path names are written along the line, sometimes rotated.
- **Areas**: buildings and rooms as plain rectangles or L shapes; water with wave marks or a grey fill; grass or fields left blank or labelled; car parks as labelled rectangles; hatching for special strips (housing, a parking area).
- **Named features**: short labels (1 to 3 words), usually written inside the shape they name, or in a small box beside a point feature.
- **Symbols**: trees (the most common symbol, often 5 to 15 of them), information boards, a refreshment stand, benches, a bridge, a railway track. A symbol or line style that is not obvious is explained in a **key** (3 maps have one, each for a single entry).
- **Compass**: 12 of 15 maps have one. Forms: a four-arm cross with N, S, E, W (most common), a single "N" arrow, or a decorative rose. It sits in a corner or just outside the frame, never on top of the drawing.
- **Entrances and start point**: named gates written outside the boundary; an arrow with "Entrance"; or a "You are here" mark with an arrow and caption. When the start is shown, it is almost always on the bottom edge, so the listener begins by walking "up" the map.
- **Title**: about half the maps have a short title above the frame.
- **Style**: black line drawing on white, a single sans-serif face, at most one grey fill. No colour.

## 3. How letters are placed

Letter marks:
- **Square boxes** (6 maps): the most common. A small square with one capital letter, the same size everywhere.
- **Circles** (4 maps), **plain letters with no box** (2 maps), **numbers** (1 map).

Where a letter goes:
1. **Inside an unnamed building, room or area.** The answer places are the shapes with no name; the named shapes around them are landmarks. This is the main pattern on site plans and floor plans.
2. **Beside a path at a point** (next to a bend, a junction or a path end), for outdoor sites and towns.
3. **On the road itself**, marking a spot such as a crossing.
4. **With a short arrow** from the box to the exact spot, when the spot is too small for the box.
5. **Just outside the boundary**, for a place beyond a gate or across a road.

Rules the real maps keep:
- Letters are **not in route order**. They are scattered (roughly reading order at most), so the order never gives the answer away.
- A letter never sits on a named feature's label, and two letters are never close enough to be confused.
- Some letters are **unused**: there are always more letters than questions.
- A letter box is the same size wherever it is; it is never the visual focus of the map.

## 4. Density

| Measure | Range seen | Typical |
|---|---|---|
| Lettered places | 7 to 10 | 9 |
| Questions | 4 to 7 | 6 |
| Unused letters | 2 to 5 | 3 |
| Named features (labels on the map) | 4 to 12 | 7 |
| Symbols (mostly trees) | 0 to 15 | 6 |
| Key entries | 0 to 1 | 0 |

So a typical map holds about 9 letters, 7 names and a handful of trees, and roughly one letter in three is a distractor that is never asked about.

## 5. What this means for our maps on a phone

The real maps were printed on an exam paper roughly 17 cm wide. Our learners mostly practise on phones (owner decision, ticket 07), where a 1000-unit map is drawn 326 px wide (the player's map frame on a 360 px phone), so **1 px is about 3.3 map units**. That sets hard limits:

- A room label at 11 px needs a room of at least about 150 x 100 map units (two short lines), and a 26 px letter box needs at least about 100 x 100.
- Two letters need at least 120 map units between centres (the existing `target-spacing` rule).
- That allows about 6 rooms across a 1000-unit map. Real-exam density (9 letters, 7 names) fits only if the map is taller than it is wide, or if the player offers zoom.
- A full four-letter compass cross does not fit beside a phone-width map; a single north arrow does.

Tier guidance (from the spec's content set, checked against these maps): tier 1 uses about 5 to 6 letters and 4 names; tier 2 about 8 letters and 6 to 8 names; tier 3 is real-exam density (9 or more letters).

## 6. How the recordings describe places

From the owner's transcripts of 5 of the reference maps (27 questions), kept locally next to the images and never committed. Patterns only; no wording is reproduced.

**Each question starts again from a fixed point.** No speaker in the five walks on from the previous answer place. Each question is anchored afresh, in one of four ways:

| Anchor | Questions | Example of the pattern |
|---|---|---|
| A short walk from the start point (car park, "you are here", an entrance) | about 4 | ahead, turn at the first board, take the right fork, it is at the end |
| A named landmark plus a relation | about 13 | directly north of a named building, opposite side of the hall, beyond a line of trees |
| A compass zone or the boundary | about 7 | the south-west corner, the middle of the northern edge |
| Counting or a path feature | about 3 | the second turning on the left, in a bend of the path |

So only about 1 question in 7 is a real walk. Most say where a place is, not how to get there. Questions are always asked in the order they are spoken, but the answer places jump around the map.

**Each answer is 2 to 4 sentences:** the anchor, the relation, then a confirming detail (the building's shape, what is inside, what you can see from there), often followed by a sentence of background that is not needed for the answer.

**Compass words are everywhere.** All five use them (north, north-east, south-west corner and so on), several times per recording. A compass on the map is essential, not decoration.

**Spatial language used:** corner, boundary, edge, far side, opposite side, beyond, alongside, adjoining, between, next to, just below or to the south of, at the end, in a bend, at a fork, first or second turning, as you go in (left or right).

**How the recordings mislead (distractors):**
- A second place mentioned next to the answer (another room in the same building, on the other side).
- The old or rejected location: where something used to be, or where it was nearly put, before the real one (common in "proposed changes" maps).
- A negative clue: a place that is *not* reached by the covered walkway or the main path.
- An overshoot warning: if you reach a named feature, you have gone too far.
- Two places near the same landmark, told apart only by the relation (above or below, left or right of it).

**Two talk styles:** a guide speaking to visitors on the spot ("we are here"), and a planner presenting a map of changes to residents. The second style uses no walking at all.

Note: the transcript file also contains stray web advert text between paragraphs; it is not part of the recordings.
