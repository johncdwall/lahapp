// Game data loading: repo file first (filled by the GitHub Action), then the NHL API directly.
const API = 'https://api-web.nhle.com/v1';
async function getJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
export async function listLocal() {
  try { return await getJson('data/games/index.json'); } catch { return []; }
}
export async function loadGame(id) {
  try {
    const f = await getJson(`data/games/${id}.json`);
    f.pbp._landing = f.landing || null;
    return f.pbp;
  } catch { /* fall through to the API */ }
  const pbp = await getJson(`${API}/gamecenter/${id}/play-by-play`);
  try { pbp._landing = await getJson(`${API}/gamecenter/${id}/landing`); } catch { pbp._landing = null; }
  return pbp;
}
export async function listByDate(date) {
  const j = await getJson(`${API}/score/${date}`);
  return (j.games || []).map(g => ({ id: g.id, title: `${g.awayTeam.abbrev} at ${g.homeTeam.abbrev}`, date, state: g.gameState }));
}
