c1: Hello, and welcome to the Open Day at Riverside Community Centre.
c2: We’re standing at the main entrance, with north at the top of the map. I’ll show you three rooms.
c3: First, the Quiet Lounge. From the main entrance, go straight up the main hall to the noticeboard, and turn right.
c4: You’ll pass the meeting room on your right. The Quiet Lounge is at the far end of that corridor, also on your right.
c5: Next, the Craft Room. Starting from the main entrance again, go up to the noticeboard, and turn left this time.
c6: At the end of the corridor, turn right, and head north.
c7: The first door on your left is the staff office. The Craft Room is the very next door, directly north of it.
c8: And finally, the table tennis room. Start from the main entrance once more, turn left at the noticeboard, then right at the end, heading north.
c9: Walk on past the café, on your right, to the end of the corridor.
c10: The table tennis room is through the door on your left... no, sorry, my mistake — it’s on your right.
c11: You’ll find it directly north of the café.
c12: That’s all three rooms. Enjoy the Open Day!

(200 words.)

2. JSON
{
  "transcript": {
    "cues": [
      { "id": "c1", "start": 0, "end": 0, "text": "Hello, and welcome to the Open Day at Riverside Community Centre." },
      { "id": "c2", "start": 0, "end": 0, "text": "We're standing at the main entrance, with north at the top of the map. I'll show you three rooms." },
      { "id": "c3", "start": 0, "end": 0, "text": "First, the Quiet Lounge. From the main entrance, go straight up the main hall to the noticeboard, and turn right." },
      { "id": "c4", "start": 0, "end": 0, "text": "You'll pass the meeting room on your right. The Quiet Lounge is at the far end of that corridor, also on your right." },
      { "id": "c5", "start": 0, "end": 0, "text": "Next, the Craft Room. Starting from the main entrance again, go up to the noticeboard, and turn left this time." },
      { "id": "c6", "start": 0, "end": 0, "text": "At the end of the corridor, turn right, and head north." },
      { "id": "c7", "start": 0, "end": 0, "text": "The first door on your left is the staff office. The Craft Room is the very next door, directly north of it." },
      { "id": "c8", "start": 0, "end": 0, "text": "And finally, the table tennis room. Start from the main entrance once more, turn left at the noticeboard, then right at the end, heading north." },
      { "id": "c9", "start": 0, "end": 0, "text": "Walk on past the café, on your right, to the end of the corridor." },
      { "id": "c10", "start": 0, "end": 0, "text": "The table tennis room is through the door on your left... no, sorry, my mistake — it's on your right." },
      { "id": "c11", "start": 0, "end": 0, "text": "You'll find it directly north of the café." },
      { "id": "c12", "start": 0, "end": 0, "text": "That's all three rooms. Enjoy the Open Day!" }
    ]
  },
  "events": [
    { "id": "e1", "cueId": "c3", "kind": "move", "landmarkId": "main-entrance", "at": { "x": 500, "y": 840 }, "word": "From the main entrance" },
    { "id": "e2", "cueId": "c3", "kind": "turn", "landmarkId": "noticeboard", "at": { "x": 500, "y": 560 }, "word": "turn right" },
    { "id": "e3", "cueId": "c4", "kind": "landmark", "landmarkId": "meeting-room", "at": { "x": 640, "y": 560 }, "word": "the meeting room on your right" },
    { "id": "e4", "cueId": "c4", "kind": "move", "at": { "x": 922, "y": 560 }, "word": "at the far end" },
    { "id": "e5", "cueId": "c4", "kind": "move", "at": { "x": 922, "y": 585 }, "word": "of that corridor" },
    { "id": "e6", "cueId": "c4", "kind": "destination", "at": { "x": 933, "y": 702 }, "word": "also on your right" },

    { "id": "e7", "cueId": "c5", "kind": "move", "landmarkId": "main-entrance", "startsLeg": true, "at": { "x": 500, "y": 840 }, "word": "Starting from the main entrance again" },
    { "id": "e8", "cueId": "c5", "kind": "turn", "landmarkId": "noticeboard", "at": { "x": 500, "y": 560 }, "word": "turn left this time" },
    { "id": "e9", "cueId": "c6", "kind": "move", "at": { "x": 290, "y": 560 }, "word": "turn right" },
    { "id": "e10", "cueId": "c7", "kind": "landmark", "landmarkId": "staff-office", "at": { "x": 290, "y": 492 }, "word": "staff office" },
    { "id": "e11", "cueId": "c7", "kind": "move", "at": { "x": 290, "y": 335 }, "word": "the very next door" },
    { "id": "e12", "cueId": "c7", "kind": "move", "at": { "x": 265, "y": 335 }, "word": "directly north" },
    { "id": "e13", "cueId": "c7", "kind": "destination", "at": { "x": 182, "y": 335 }, "word": "of it" },

    { "id": "e14", "cueId": "c8", "kind": "move", "landmarkId": "main-entrance", "startsLeg": true, "at": { "x": 500, "y": 840 }, "word": "Start from the main entrance once more" },
    { "id": "e15", "cueId": "c8", "kind": "turn", "landmarkId": "noticeboard", "at": { "x": 500, "y": 560 }, "word": "turn left at the noticeboard" },
    { "id": "e16", "cueId": "c8", "kind": "move", "at": { "x": 290, "y": 560 }, "word": "then right at the end" },
    { "id": "e17", "cueId": "c9", "kind": "landmark", "landmarkId": "cafe", "at": { "x": 290, "y": 307 }, "word": "past the café, on your right" },
    { "id": "e18", "cueId": "c9", "kind": "move", "at": { "x": 290, "y": 92 }, "word": "to the end of the corridor" },
    { "id": "e19", "cueId": "c10", "kind": "correction",
      "note": "She first suggests the door on her left (room G), then corrects herself to the right (the table tennis room, H).",
      "at": { "x": 265, "y": 92 }, "wrongPath": [ { "x": 265, "y": 92 } ],
      "word": "the door on your left" },
    { "id": "e20", "cueId": "c10", "kind": "move", "at": { "x": 315, "y": 92 }, "word": "it's on your right" },
    { "id": "e21", "cueId": "c11", "kind": "destination", "at": { "x": 392, "y": 92 }, "word": "directly north of the café" }
  ],
  "questions": [
    {
      "id": "q1", "prompt": "Quiet Lounge", "answerLabel": "C", "eventId": "e6", "microSkill": "spatial-language",
      "hints": [ { "level": 1, "landmarkId": "meeting-room" }, { "level": 2, "cueId": "c4" } ],
      "explanation": {
        "en": "The guide walks up the main hall and turns right at the noticeboard, passing the meeting room; the Quiet Lounge is «at the far end of that corridor, also on your right». D is on the right too, but it isn't at the far end, and A sits on the left side of the corridor. Only C is both at the far end and on the right.",
        "ar": "تصعد المرشدة في القاعة الرئيسية وتنعطف يمينًا عند لوحة الإعلانات فتمرّ بغرفة الاجتماعات، ثم تصف غرفة الهدوء بأنها «at the far end of that corridor, also on your right» أي في آخر الممر تمامًا وعلى اليمين. الحرف D يقع على اليمين أيضًا لكنه ليس في آخر الممر، والحرف A يقع على يسار الممر، فالحرف C وحده يحقق الشرطين معًا."
      }
    },
    {
      "id": "q2", "prompt": "Craft Room", "answerLabel": "F", "eventId": "e13", "microSkill": "landmark-vs-answer",
      "hints": [ { "level": 1, "landmarkId": "staff-office" }, { "level": 2, "cueId": "c7" } ],
      "explanation": {
        "en": "The staff office is only a landmark, not the answer. The Craft Room is «the very next door, directly north of it» — the room right after it. G is the next lettered room further up the corridor, past the Store, so it isn't directly north of the staff office; only F is.",
        "ar": "مكتب الموظفين هنا علامة توجيه فقط وليس هو الإجابة. فالمرشدة تقول إن غرفة الأشغال اليدوية هي «the very next door, directly north of it» أي الباب الذي يلي المكتب مباشرة من جهة الشمال. أما الحرف G فيقع في الغرفة التالية الأبعد في الممر بعد المخزن، فهو لا يقع مباشرة شمال المكتب، ولذلك فالإجابة الوحيدة الممكنة هي الحرف F."
      }
    },
    {
      "id": "q3", "prompt": "Table tennis room", "answerLabel": "H", "eventId": "e21", "microSkill": "corrections-distractors",
      "hints": [ { "level": 1, "landmarkId": "cafe" }, { "level": 2, "cueId": "c10" } ],
      "explanation": {
        "en": "The guide first says the door is «on your left», which would point to G, then corrects herself: «it's on your right». Trust the correction: the table tennis room is directly north of the café, on the right — that's H, not G.",
        "ar": "تقول المرشدة أولًا إن الباب يقع «on your left» ويشير هذا إلى الحرف G، ثم تصحّح كلامها فتقول إنه «it's on your right» وهو ما يؤكّد الإجابة الصحيحة. اعتمد دائمًا على التصحيح الأخير: فغرفة تنس الطاولة تقع مباشرة شمال المقهى على اليمين، وهذا هو الحرف H لا الحرف G."
      }
    }
  ]
}
3. Self-check

Event table

id	cue	word	at	lies on
e1	c3	“From the main entrance”	(500,840)	main-hall (entrance anchor)
e2	c3	“turn right”	(500,560)	main-hall / east-corridor junction
e3	c4	“the meeting room on your right”	(640,560)	east-corridor
e4	c4	“at the far end”	(922,560)	east-corridor
e5	c4	“of that corridor”	(922,585)	room-c door
e6	c4	“also on your right”	(933,702)	room-c letter point (C)
e7	c5	“Starting from the main entrance again”	(500,840)	main-hall (entrance anchor, startsLeg)
e8	c5	“turn left this time”	(500,560)	junction
e9	c6	“turn right”	(290,560)	west-corridor corner
e10	c7	“staff office”	(290,492)	west-corridor (vertical), beside staff-office door
e11	c7	“the very next door”	(290,335)	west-corridor (vertical), beside room-f door
e12	c7	“directly north”	(265,335)	room-f door
e13	c7	“of it”	(182,335)	room-f letter point (F)
e14	c8	“Start from the main entrance once more”	(500,840)	main-hall (entrance anchor, startsLeg)
e15	c8	“turn left at the noticeboard”	(500,560)	junction
e16	c8	“then right at the end”	(290,560)	west-corridor corner
e17	c9	“past the café, on your right”	(290,307)	west-corridor (vertical), beside café door
e18	c9	“to the end of the corridor”	(290,92)	west-corridor (vertical), top
e19	c10	“the door on your left”	(265,92)	room-g door (wrongPath target)
e20	c10	“it’s on your right”	(315,92)	room-h door
e21	c11	“directly north of the café”	(392,92)	room-h letter point (H)

Traps used: decoy room (Q2, Craft Room — room G); self-correction, left/right pair (Q3, Table tennis room — wrong side room G, corrected to H). Two traps total, within tier 2’s “one or two.” No preposition trap.

Per-question direction check

Q1 (C): Walking north from the entrance, “turn right” at the junction → east (matches rule: walking north, right is east). Walking east, “right” = south (matches rule). Meeting room (y585–820, south of the y=560 corridor) is correctly “on your right.” Room-c (x865–980, south of corridor, furthest east of the southern rooms) is correctly “at the far end... on your right.”
Tempting wrong letters: D (x750–865, also south/right of the corridor, but stops short of the far east end — ruled out by “at the far end”). A (x470–740, y400–535, north of the corridor, i.e. on the left while walking east — ruled out by “on your right”).
Q2 (F): “Turn left” at the junction while walking north → west (matches rule). “Turn right” at the west-corridor corner while walking west → north (matches rule: walking west, right is north). Staff office (x100–265) is correctly “on your left” while walking north. Room-f (y270–400) sits immediately north of staff-office (y400–585, contiguous at y=400) — “directly north of it” is true.
Tempting wrong letters: G (y20–165, further up past the Store — not directly north of staff-office, since F and the Store sit between them; ruled out by “the very next door”). Secondary check: E is never on this leg’s path at all (it’s reached from the opposite side of the building), so it isn’t suggested by the talk.
Q3 (H): Same turns as Q2 (left at junction = west, right at corner = north), continuing further north past the café (x315–470, correctly “on your right” while walking north). At the top of the corridor (y≈92), “on your left” (west) is room-g’s door (265,92) — a real door, correctly the wrongPath target. The correction “it’s on your right” (east) is room-h’s door (315,92), correct. Room-h (y20–165) sits directly north of the café (y215–400) along the same east-side column.
Tempting wrong letters: G (the mistaken side, ruled out by trusting the correction, not the first statement). Secondary check: E is never mentioned or pointed to by any word in this leg (unlike the old north/south version), so it isn’t a live trap here.

Word count: 200 words (c1–c12 combined, by manual count above). At the previously-approved 155 wpm overall pace, that is ≈77 seconds, inside tier 2’s 65–85 s window — but this needs re-verifying once actually rendered, since word-counting by hand is error-prone.