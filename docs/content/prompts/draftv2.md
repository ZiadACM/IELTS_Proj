1. Talk

c1: Welcome to the Open Day at Riverside Community Centre.
c2: You’re at the main entrance - north is at the top.
c3: First, the Quiet Lounge. Starting again from the main entrance, up the main hall to the noticeboard, and turn right.
c4: Follow the corridor. The meeting room is on your right; keep going to the far end.
c5: The last door on the right, at the far end, is the Quiet Lounge. Your answer is C.
c6: Now the Craft Room. Starting again from the main entrance, up the main hall to the noticeboard, but turn left.
c7: Follow the corridor, turn right, and head north toward the far side.
c8: You’ll pass the staff office on your left - not that one. The Craft Room is the next door after it; your answer is F.
c9: Last, the Table Tennis Room. Starting again from the main entrance, up the main hall to the noticeboard, and turn left.
c10: Follow the corridor, turn right, and head north, past the staff office, almost to the top.
c11: You’ll reach the café on your left - sorry, your right - and a little further, the Table Tennis Room is the next door, directly north of the café. Your answer is H.
c12: That’s all three. Good luck!

2. JSON
{
  "transcript": {
    "cues": [
      {"id": "c1", "text": "Welcome to the Open Day at Riverside Community Centre.", "start": 0, "end": 0},
      {"id": "c2", "text": "You're at the main entrance - north is at the top.", "start": 0, "end": 0},
      {"id": "c3", "text": "First, the Quiet Lounge. Starting again from the main entrance, up the main hall to the noticeboard, and turn right.", "start": 0, "end": 0},
      {"id": "c4", "text": "Follow the corridor. The meeting room is on your right; keep going to the far end.", "start": 0, "end": 0},
      {"id": "c5", "text": "The last door on the right, at the far end, is the Quiet Lounge. Your answer is C.", "start": 0, "end": 0},
      {"id": "c6", "text": "Now the Craft Room. Starting again from the main entrance, up the main hall to the noticeboard, but turn left.", "start": 0, "end": 0},
      {"id": "c7", "text": "Follow the corridor, turn right, and head north toward the far side.", "start": 0, "end": 0},
      {"id": "c8", "text": "You'll pass the staff office on your left - not that one. The Craft Room is the next door after it; your answer is F.", "start": 0, "end": 0},
      {"id": "c9", "text": "Last, the Table Tennis Room. Starting again from the main entrance, up the main hall to the noticeboard, and turn left.", "start": 0, "end": 0},
      {"id": "c10", "text": "Follow the corridor, turn right, and head north, past the staff office, almost to the top.", "start": 0, "end": 0},
      {"id": "c11", "text": "You'll reach the café on your left - sorry, your right - and a little further, the Table Tennis Room is the next door, directly north of the café. Your answer is H.", "start": 0, "end": 0},
      {"id": "c12", "text": "That's all three. Good luck!", "start": 0, "end": 0}
    ]
  },
  "events": [
    {"id": "e1", "kind": "move", "landmarkId": "main-entrance", "at": {"x": 500, "y": 840}, "cueId": "c3", "word": "Starting again from the main entrance"},
    {"id": "e2", "kind": "landmark", "landmarkId": "noticeboard", "at": {"x": 500, "y": 560}, "cueId": "c3", "word": "to the noticeboard"},
    {"id": "e3", "kind": "turn", "landmarkId": "noticeboard", "at": {"x": 500, "y": 560}, "cueId": "c3", "word": "turn right"},
    {"id": "e4", "kind": "landmark", "landmarkId": "meeting-room", "at": {"x": 640, "y": 560}, "cueId": "c4", "word": "The meeting room is on your right"},
    {"id": "e5", "kind": "move", "at": {"x": 922, "y": 560}, "cueId": "c4", "word": "to the far end"},
    {"id": "e6", "kind": "move", "at": {"x": 922, "y": 585}, "cueId": "c5", "word": "The last door on the right"},
    {"id": "e7", "kind": "destination", "at": {"x": 933, "y": 702}, "cueId": "c5", "word": "is the Quiet Lounge"},

    {"id": "e8", "kind": "move", "landmarkId": "main-entrance", "at": {"x": 500, "y": 840}, "cueId": "c6", "word": "Starting again from the main entrance", "startsLeg": true},
    {"id": "e9", "kind": "landmark", "landmarkId": "noticeboard", "at": {"x": 500, "y": 560}, "cueId": "c6", "word": "to the noticeboard"},
    {"id": "e10", "kind": "turn", "landmarkId": "noticeboard", "at": {"x": 500, "y": 560}, "cueId": "c6", "word": "turn left"},
    {"id": "e11", "kind": "move", "at": {"x": 290, "y": 560}, "cueId": "c7", "word": "turn right"},
    {"id": "e12", "kind": "landmark", "landmarkId": "staff-office", "at": {"x": 290, "y": 492}, "cueId": "c8", "word": "the staff office on your left"},
    {"id": "e13", "kind": "move", "at": {"x": 265, "y": 335}, "cueId": "c8", "word": "The Craft Room is the next door after it"},
    {"id": "e14", "kind": "destination", "at": {"x": 182, "y": 335}, "cueId": "c8", "word": "your answer is F"},

    {"id": "e15", "kind": "move", "landmarkId": "main-entrance", "at": {"x": 500, "y": 840}, "cueId": "c9", "word": "Starting again from the main entrance", "startsLeg": true},
    {"id": "e16", "kind": "landmark", "landmarkId": "noticeboard", "at": {"x": 500, "y": 560}, "cueId": "c9", "word": "to the noticeboard"},
    {"id": "e17", "kind": "turn", "landmarkId": "noticeboard", "at": {"x": 500, "y": 560}, "cueId": "c9", "word": "turn left"},
    {"id": "e18", "kind": "move", "at": {"x": 290, "y": 560}, "cueId": "c10", "word": "turn right"},
    {"id": "e19", "kind": "landmark", "landmarkId": "staff-office", "at": {"x": 290, "y": 492}, "cueId": "c10", "word": "past the staff office"},
    {"id": "e20", "kind": "landmark", "landmarkId": "cafe", "at": {"x": 290, "y": 307}, "cueId": "c11", "word": "the café on your left"},
    {"id": "e21", "kind": "correction", "at": {"x": 290, "y": 307}, "cueId": "c11", "word": "sorry, your right", "note": "She says the café (and the Table Tennis Room beyond it) is on your left, then corrects herself: it is on your right."},
    {"id": "e22", "kind": "move", "at": {"x": 290, "y": 92}, "cueId": "c11", "word": "a little further"},
    {"id": "e23", "kind": "move", "at": {"x": 315, "y": 92}, "cueId": "c11", "word": "directly north of the café"},
    {"id": "e24", "kind": "destination", "at": {"x": 392, "y": 92}, "cueId": "c11", "word": "Your answer is H"}
  ],
  "questions": [
    {
      "prompt": "Quiet Lounge",
      "answerLabel": "C",
      "eventId": "e7",
      "microSkill": "spatial-language",
      "hints": [
        {"level": 1, "landmarkId": "meeting-room"},
        {"level": 2, "cueId": "c5"}
      ],
      "explanation": {
        "en": "The guide says the Quiet Lounge is the last door on the right, at the far end of the corridor. Room D is also on the right but comes before the far end, making it a trap; Room A is near the end but on the left, not the right. Only C is both on the right and at the very end.",
        "ar": "تقول المرشدة إن غرفة الهدوء هي «the last door on the right»، أي آخر باب على اليمين عند نهاية الممر. غرفة D أيضاً على اليمين لكنها ليست في النهاية، لذلك فهي فخ؛ وغرفة A قريبة من النهاية لكنها على اليسار لا اليمين. الإجابة الصحيحة هي C لأنها الوحيدة على اليمين وفي نهاية الممر معاً."
      }
    },
    {
      "prompt": "Craft Room",
      "answerLabel": "F",
      "eventId": "e14",
      "microSkill": "landmark-vs-answer",
      "hints": [
        {"level": 1, "landmarkId": "staff-office"},
        {"level": 2, "cueId": "c8"}
      ],
      "explanation": {
        "en": "The guide says the Craft Room is 'the next door after it,' directly past the staff office on the left. Room G lies further along the same corridor, so picking it means walking too far; the staff office itself has no letter, so it can't be the answer. F is correct because it comes right after the staff office.",
        "ar": "تقول المرشدة إن غرفة الأشغال اليدوية هي «the next door after it» بعد مكتب الموظفين، أي الباب الذي يليه مباشرة على اليسار. غرفة G تقع أبعد في الممر نفسه، فاختيارها يعني السير مسافة أطول من اللازم؛ ومكتب الموظفين نفسه ليس غرفة مرقّمة بحرف لتكون إجابة. الإجابة الصحيحة هي F لأنها الباب الذي يلي مكتب الموظفين تماماً."
      }
    },
    {
      "prompt": "Table tennis room",
      "answerLabel": "H",
      "eventId": "e24",
      "microSkill": "corrections-distractors",
      "hints": [
        {"level": 1, "landmarkId": "cafe"},
        {"level": 2, "cueId": "c11"}
      ],
      "explanation": {
        "en": "The guide first says the café is on your left, then corrects herself to your right, and places the Table Tennis Room directly north of the café on that same side. Room G sits on the opposite side of the corridor at a similar height - the side she first named by mistake - making it a trap for anyone who misses the correction. Room E lies just south of the café, the wrong direction entirely, so H (north of the café) is correct.",
        "ar": "تقول المرشدة أولاً إن المقهى «on your left»، ثم تصحح نفسها إلى «your right»، وتضع غرفة تنس الطاولة شمال المقهى مباشرة على الجانب نفسه. غرفة G تقع في الجهة المقابلة من الممر وعلى ارتفاع مشابه، وهي الجهة التي ذكرتها المرشدة أولاً بالخطأ، فتكون فخاً لمن لا يسمع التصحيح. أما غرفة E فتقع جنوب المقهى مباشرة، وهو اتجاه معاكس، والإجابة الصحيحة هي H الواقعة شمال المقهى."
      }
    }
  ]
}
3. Self-check
Event	Cue	Word	At	Lies on
e1	c3	Starting again from the main entrance	(500,840)	Main hall, south end (fixed entrance point)
e2	c3	to the noticeboard	(500,560)	Junction (Main hall / East / West corridor)
e3	c3	turn right	(500,560)	Junction
e4	c4	The meeting room is on your right	(640,560)	East corridor, beside meeting-room door
e5	c4	to the far end	(922,560)	East corridor, beside room-c door
e6	c5	The last door on the right	(922,585)	room-c door point
e7	c5	is the Quiet Lounge	(933,702)	room-c letter point (answer)
e8	c6	Starting again from the main entrance	(500,840)	Main hall, south end
e9	c6	to the noticeboard	(500,560)	Junction
e10	c6	turn left	(500,560)	Junction
e11	c7	turn right	(290,560)	West corridor corner
e12	c8	the staff office on your left	(290,492)	West corridor (vertical), beside staff-office door
e13	c8	The Craft Room is the next door after it	(265,335)	room-f door point
e14	c8	your answer is F	(182,335)	room-f letter point (answer)
e15	c9	Starting again from the main entrance	(500,840)	Main hall, south end
e16	c9	to the noticeboard	(500,560)	Junction
e17	c9	turn left	(500,560)	Junction
e18	c10	turn right	(290,560)	West corridor corner
e19	c10	past the staff office	(290,492)	West corridor (vertical), beside staff-office door
e20	c11	the café on your left	(290,307)	West corridor (vertical), beside café door
e21	c11	sorry, your right	(290,307)	Same point (self-correction, not a move)
e22	c11	a little further	(290,92)	West corridor (vertical), room-h level
e23	c11	directly north of the café	(315,92)	room-h door point
e24	c11	Your answer is H	(392,92)	room-h letter point (answer)

Direction checks

Q1 (C): Walking north (500,840→500,560), then turn right = east (facing north, right is east) onto the east corridor. Meeting-room door (640,585) is south of the corridor line (y=560) → south = right while walking east. ✓ Room-c door (922,585) is also south → right. ✓ Room-c (x up to 980) sits closer to the corridor’s far end (980,560) than room-d (door x=807), so “last door... at the far end” picks C, not D. ✓ Room-a (door 605,467, north of the corridor, y<560) is on the left, consistent with never being called “right.” ✓
Two most tempting wrong letters: D (also on the right, but before the far end — ruled out by “the last door... at the far end”); A (near the far end, but on the left — ruled out by “on the right”).
Q2 (F): Turn left = west (facing north, left is west) at the junction onto the west corridor; right = north (facing west, right is north) at the corner (290,560) onto the vertical segment. Staff-office door (265,492) is west of the corridor (x=290) → left while heading north. ✓ Room-f door (265,335) is also west, immediately north of staff-office’s range (400–585) → “next door after it, still on the left.” ✓
Two most tempting wrong letters: G (same corridor, further north past F — overshoot if “next door” is misjudged). A second lettered trap is weak here (no other lettered room sits between the staff office and F); flagged in notes.
Q3 (H): Same left/right at junction and corner as Q2. Café door (315,307) is east of the corridor (x=290) → right while heading north — the guide’s first word (“left”) is wrong and the correction (“right”) is the true side. ✓ Room-h door (315,92) is also east, due north of the café (same x-span 315–470, y 20–165 vs 215–400) → “directly north of the café,” same (right) side. ✓
Two most tempting wrong letters: G (opposite side of the corridor, similar height — the side the guide names by mistake before correcting); E (directly south of the café — the wrong direction entirely, ruled out by “north”).

Word count: 202 words.

4. Notes for the reviewer
Pace is at the edge of the target. 202 words is slightly over the “about 170 to 200” range, and at 150 wpm that’s ~81s, just past “about 65 to 80 seconds.” I trimmed as much boilerplate as I could without losing the required “starting again from the main entrance” phrasing each leg, the self-correction, and the landmark-vs-answer contrast. The coding agent should check actual rendered pace (D22 already sets Kokoro speed independent of word count) rather than treat this as a hard fail.
Noticeboard’s “at” point: the map table lists the noticeboard at (500,545), which is not exactly on a corridor line, a door, or a letter point. I used the junction (500,560) instead for its landmark/turn events, since it’s effectively colocated and that point is a valid corridor point. Flagging this substitution for confirmation.
Q2’s second trap is weak. G is a solid overshoot trap, but no other lettered room sits between the staff office and the Craft Room, so I couldn’t find an equally strong second trap — same issue the independent reviewer flagged on the earlier draft. Worth a second look rather than treating it as resolved.
Didn’t reuse “Craft Room” as a name in Q3’s leg, even though it’s this talk’s own name for F, because the map itself only labels it with letter F (not a named room) — per the hard rule, lettered rooms can’t be named except as the place currently being asked about. I treated “staff office” and “café” as safe to reuse across legs since those are genuinely labelled on the map.
Room-b, toilets, and a few other southern rooms don’t appear to sit on any of the four listed corridor segments at all (their doors are off-line by more than the usual 25px door offset) — not used in this draft, but worth a look if a future item needs them.
I did not listen to any audio (none exists yet) and did not judge the Arabic beyond following the stated phrasing/quoting rules myself — it still needs a fluent-reader check per ticket 02/03.