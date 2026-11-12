// SYNTHETIC rule self-test for .semgrep/security.yml (run: semgrep --test .semgrep). Not application code.
declare const el: any, db: any, sql: any, userText: string, id: string;

// ruleid: ielts-raw-html-sink
el.innerHTML = userText;
// ruleid: ielts-raw-html-sink
el.insertAdjacentHTML('beforeend', userText);
// ruleid: ielts-raw-html-sink
document.write(userText);
// ok: ielts-raw-html-sink
el.textContent = userText;

// ruleid: ielts-string-built-query
db.query(`SELECT * FROM attempts WHERE id = '${id}'`);
// ruleid: ielts-string-built-query
db.query("SELECT * FROM attempts WHERE id = '" + id + "'");
// ruleid: ielts-string-built-query
db.unsafe(userText);
// ok: ielts-string-built-query
db.query('SELECT * FROM attempts WHERE id = $1', [id]);
// ok: ielts-string-built-query
db.query(sql`SELECT * FROM attempts WHERE id = ${id}`);
