// LAH rules engine (Draft 7). Pure functions: no DOM, no network.
import { PLAYERS, ACTIONS } from './data/cards.js';

export const PEN_TYPES = ['Slashing','Cross Checking','Tripping','Hooking','Holding','Roughing','Fighting','High-Sticking','Delay Of Game','Goaltender Interference','Too Many Men','Any Minor Penalty','Any Bench Minor Penalty','Any Major Penalty'];
const DESC_TO_TYPE = {
  'slashing':'Slashing','cross-checking':'Cross Checking','tripping':'Tripping','hooking':'Hooking','holding':'Holding',
  'roughing':'Roughing','fighting':'Fighting','high-sticking':'High-Sticking','delaying-game':'Delay Of Game',
  'interference-goalkeeper':'Goaltender Interference','too-many-men-on-the-ice':'Too Many Men',
};
const PERIOD_NAMES = ['','First','Second','Third'];

export function secs(t) { const [m, s] = String(t || '0:0').split(':').map(Number); return m * 60 + s; }

// ---- parse an NHL play-by-play JSON into ordered LAH events ----
export function parseGame(pbp) {
  const roster = new Map();
  for (const r of pbp.rosterSpots || []) roster.set(r.playerId, { n: r.sweaterNumber, pos: r.positionCode, team: r.teamId });
  const home = pbp.homeTeam || {}, away = pbp.awayTeam || {};
  const dressed = new Set([...roster.values()].map(r => r.n));
  const events = [];
  let seq = 0;
  for (const p of pbp.plays || []) {
    const pd = p.periodDescriptor || {};
    const per = pd.number || 1, ptype = pd.periodType || 'REG';
    if (ptype === 'SO') continue; // shootout not scored in v0
    const t = secs(p.timeInPeriod), d = p.details || {};
    const sc = String(p.situationCode || '');
    const awayG = sc[0] === '1', homeG = sc[3] === '1';
    const unequal = sc.length === 4 && awayG && homeG && sc[1] !== sc[2];
    const base = { id: p.eventId, per, ptype, t, ord: seq++, unequal, time: p.timeInPeriod, sit: sc };
    if (p.typeDescKey === 'goal') {
      const sp = roster.get(d.scoringPlayerId); if (!sp) continue;
      const ownerHome = d.eventOwnerTeamId === home.id;
      const ownSk = Number(ownerHome ? sc[2] : sc[1]), oppSk = Number(ownerHome ? sc[1] : sc[2]);
      const strength = unequal ? (ownSk > oppSk ? 'PP' : 'SH') : 'EV';
      const asst = [d.assist1PlayerId, d.assist2PlayerId].filter(Boolean).map(id => roster.get(id)).filter(Boolean);
      events.push({ ...base, kind: 'goal', num: sp.n, pos: sp.pos, team: sp.team, strength, unassisted: asst.length === 0 });
      for (const a of asst) events.push({ ...base, ord: seq++, kind: 'assist', num: a.n, pos: a.pos, team: a.team, strength, goalNum: sp.n });
    } else if (p.typeDescKey === 'penalty') {
      const who = roster.get(d.committedByPlayerId) || roster.get(d.servedByPlayerId);
      const code = d.typeCode || 'MIN';
      const cls = code === 'BEN' ? 'bench' : (code === 'MAJ' || code === 'MAT') ? 'major' : code === 'MIN' ? 'minor' : 'other';
      if (!who || cls === 'other') continue;
      const type = DESC_TO_TYPE[d.descKey] || null;
      events.push({ ...base, kind: 'penalty', num: who.n, pos: who.pos, team: who.team, ptypeName: type, cls, desc: d.descKey || '' });
    } else if (p.typeDescKey === 'icing') {
      events.push({ ...base, kind: 'icing' });
    }
  }
  events.sort((a, b) => a.per - b.per || a.t - b.t || a.ord - b.ord);
  const stars = ((pbp._landing || {}).summary || {}).threeStars || [];
  return { events, dressed: [...dressed], home, away, stars: stars.map(s => ({ star: s.star, num: s.sweaterNo })) };
}

// ---- event -> card categories ----
export function eventCats(ev) {
  const c = [];
  if (ev.kind === 'goal') {
    c.push('Goal');
    if (['C','L','R'].includes(ev.pos)) c.push('Forward Goal');
    if (ev.pos === 'D') c.push('Defencemen Goal');
    if (ev.strength === 'PP') c.push('Power Play Goal');
    if (ev.strength === 'SH') c.push('Short Handed Goal');
    if (ev.ptype === 'OT') c.push('Overtime Goal');
    if (ev.unassisted) c.push('Unassisted Goal');
    if (ev.t < 60) c.push('Goal In First Minute Of Period');
    if (ev.t >= 1140 && ev.ptype === 'REG') c.push('Goal In Last Minute Of Period');
  } else if (ev.kind === 'assist') c.push('Assist');
  else if (ev.kind === 'penalty') {
    if (ev.ptypeName) c.push(ev.ptypeName);
    if (ev.cls === 'minor') c.push('Any Minor Penalty');
    if (ev.cls === 'bench') c.push('Any Bench Minor Penalty');
    if (ev.cls === 'major') c.push('Any Major Penalty');
    if (ev.ptypeName === 'Too Many Men' && !c.includes('Any Bench Minor Penalty')) c.push('Any Bench Minor Penalty');
  }
  return c;
}

// ---- player card instances ----
export function cardFor(num) { return PLAYERS.find(p => p.n === num) || null; }

// pick the single active penalty multiplier at random from the printed ones (> +1x)
export function makePlayerCard(base, rnd = Math.random) {
  const printed = PEN_TYPES.filter(k => base.pen[k] > 1);
  const type = printed.length ? printed[Math.floor(rnd() * printed.length)] : null;
  return { ...base, activeType: type, activeMult: type ? base.pen[type] : 1 };
}

export function penMatches(p, evt) { // does the card's active penalty type match a penalty event?
  if (!p.activeType) return false;
  return eventCats(evt).includes(p.activeType);
}

const playerPoints = (p, ev) => ev.kind === 'goal' ? p.g : ev.kind === 'assist' ? p.a : p.pim;
const periodBonus = (p, ev) => (ev.ptype === 'REG' && PERIOD_NAMES[ev.per] === p.period) ? p.pmult : 0;

// score one option. opt: {kind:'alone'|'action'|'ice', p, a, onLine}
export function scoreOption(opt, ev) {
  const { p, a } = opt;
  const st = ev.unequal ? 1 : 0;
  if (opt.kind === 'ice') {
    const pm = p.activeType && p.activeType === a.e ? p.activeMult : 1;
    const B = Math.max(a.m, pm);
    const total = (p.pim + a.b) * (B + st);
    return { total, math: `(${p.pim} + ${a.b}) x (${B}${st ? ' + 1 ST' : ''}) = ${total}` };
  }
  const pb = periodBonus(p, ev);
  let B, pts, parts;
  if (opt.kind === 'alone') {
    pts = playerPoints(p, ev);
    if (ev.kind === 'goal') B = p.cat.Goal; else if (ev.kind === 'assist') B = p.cat.Assist;
    else B = penMatches(p, ev) ? p.activeMult : 1;
    B = Math.max(B, 1);
    parts = `${pts} x (${B}`;
  } else {
    pts = playerPoints(p, ev) + a.b;
    let pm = 1;
    if (a.f === 'Scoring') pm = p.cat[a.e] || 1;
    else if (a.f === 'Penalty') pm = p.activeType === a.e ? p.activeMult : 1;
    B = Math.max(a.m, pm);
    parts = `(${playerPoints(p, ev)} + ${a.b}) x (${B}`;
  }
  let total = pts * (B + pb + st);
  let math = `${parts}${pb ? ` + ${pb} period` : ''}${st ? ' + 1 ST' : ''})`;
  if (opt.onLine) { total *= 2; math += ' x 2 line'; }
  return { total, math: `${math} = ${total}` };
}

// all legal options for one participant on one event. hand: {P:[...], A:[...], line: card|null}
export function options(hand, ev) {
  const out = [];
  if (ev.kind === 'icing') {
    for (const p of hand.P) for (const a of hand.A) if (a.f === 'Ice')
      out.push({ kind: 'ice', p, a, onLine: false });
  } else {
    const cats = eventCats(ev);
    for (const p of hand.P) {
      if (p.n !== ev.num) continue;
      const onLine = hand.line === p;
      out.push({ kind: 'alone', p, a: null, onLine });
      for (const a of hand.A) {
        if (a.f === 'Ice') continue;
        if (!cats.includes(a.e)) continue;
        if (ev.kind === 'penalty' && a.f !== 'Penalty') continue;
        if ((ev.kind === 'goal' || ev.kind === 'assist') && a.f !== 'Scoring') continue;
        out.push({ kind: 'action', p, a, onLine });
      }
    }
  }
  for (const o of out) { const s = scoreOption(o, ev); o.total = s.total; o.math = s.math; }
  out.sort((x, y) => y.total - x.total || x.p.n - y.p.n);
  return out;
}

export function describe(o) {
  const nm = `#${o.p.n}`;
  if (o.kind === 'alone') return `${nm} alone`;
  if (o.kind === 'ice') return `${nm} + Ice ${o.a.e} +${o.a.b}, +${o.a.m}x`;
  return `${nm} + ${o.a.e} +${o.a.b}, +${o.a.m}x`;
}

// ---- decks ----
export function buildActionDeck() {
  const d = [];
  ACTIONS.forEach((a, i) => { for (let k = 0; k < a.q; k++) d.push({ ...a, id: `a${i}-${k}` }); });
  return d;
}

export function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Rule B plain deck: one card per dressed number that has a Player Card, times copies
export function buildPlayerDeck(dressed, copies, rnd) {
  const deck = [];
  for (const n of [...new Set(dressed)].sort((a, b) => a - b)) {
    const base = cardFor(n); if (!base) continue;
    for (let k = 0; k < copies; k++) deck.push({ ...makePlayerCard(base, rnd), id: `p${n}-${k}` });
  }
  return deck;
}

export function starScore(p, stars, onLine) {
  let best = 0;
  for (const s of stars) if (s.num === p.n) best = Math.max(best, p.stars[s.star - 1] || 0);
  return best ? best * (onLine ? 2 : 1) : 0;
}
