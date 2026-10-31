// Usage: node scripts/fetch-games.mjs 2026-10-30 [more dates or game ids]
// Writes data/games/<id>.json ({pbp, landing}) and rebuilds data/games/index.json
import fs from 'node:fs'; import path from 'node:path';
const API = 'https://api-web.nhle.com/v1', DIR = 'data/games';
const j = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
fs.mkdirSync(DIR, { recursive: true });
const idxFile = path.join(DIR, 'index.json');
let index = []; try { index = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch {}
for (const arg of process.argv.slice(2)) {
  let games = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) games = (await j(`${API}/score/${arg}`)).games.filter(g => ['FINAL', 'OFF'].includes(g.gameState)).map(g => ({ id: g.id, date: arg, title: `${g.awayTeam.abbrev} at ${g.homeTeam.abbrev}` }));
  else games = [{ id: Number(arg) }];
  for (const g of games) {
    try {
      const pbp = await j(`${API}/gamecenter/${g.id}/play-by-play`);
      let landing = null; try { landing = await j(`${API}/gamecenter/${g.id}/landing`); } catch {}
      fs.writeFileSync(path.join(DIR, `${g.id}.json`), JSON.stringify({ pbp, landing }));
      const entry = { id: g.id, date: g.date || pbp.gameDate, title: g.title || `${pbp.awayTeam.abbrev} at ${pbp.homeTeam.abbrev}` };
      index = [entry, ...index.filter(e => String(e.id) !== String(g.id))];
      console.log('saved', g.id, entry.title);
    } catch (e) { console.error('skip', g.id, e.message); }
  }
}
index.sort((a, b) => String(b.date).localeCompare(String(a.date)));
fs.writeFileSync(idxFile, JSON.stringify(index.slice(0, 60), null, 1));
