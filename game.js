// LAH game flow: deal, replay events in order, rival auto-play, intermissions, stars.
import { parseGame, buildActionDeck, buildPlayerDeck, shuffle, options, describe, starScore } from './engine.js';

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function newGame(pbp, { copies = 1, seed = Date.now() % 1e9, names = ['You', 'Rival'] } = {}) {
  const rnd = mulberry32(seed);
  const game = parseGame(pbp);
  const pileP = shuffle(buildPlayerDeck(game.dressed, copies, rnd), rnd);
  const pileA = shuffle(buildActionDeck(), rnd);
  const mk = name => ({ name, hand: { P: [], A: [], line: null }, score: 0, log: [], scored: new Set(), bonus: 0 });
  const G = { game, rnd, pileP, pileA, discP: [], discA: [], me: mk(names[0]), rival: mk(names[1]), idx: 0, period: 1,
    phase: 'setup', pending: null, autoMe: false, copies, seed, bestPlay: null };
  for (const who of [G.me, G.rival]) { for (let i = 0; i < 5; i++) { draw(G, who, 'P'); draw(G, who, 'A'); } }
  G.rival.hand.line = G.rival.hand.P.length ? G.rival.hand.P[Math.floor(rnd() * G.rival.hand.P.length)] : null;
  return G;
}

function draw(G, who, kind) {
  const pile = kind === 'P' ? G.pileP : G.pileA;
  if (!pile.length) return null;
  const c = pile.pop(); who.hand[kind].push(c); return c;
}

export function setLine(G, who, card) { who.hand.line = card && who.hand.P.includes(card) ? card : null; }

function applyPlay(G, who, opt, ev) {
  who.score += opt.total;
  who.scored.add(opt.p.n);
  opt.p.scoredBy = who.name;
  who.log.push({ per: ev.per, time: ev.time, what: describe(opt), total: opt.total, math: opt.math });
  if (!G.bestPlay || opt.total > G.bestPlay.total) G.bestPlay = { who: who.name, what: describe(opt), total: opt.total, per: ev.per, time: ev.time };
  const h = who.hand;
  h.P.splice(h.P.indexOf(opt.p), 1); G.discP.push(opt.p);
  if (h.line === opt.p) h.line = null;
  if (opt.a) { h.A.splice(h.A.indexOf(opt.a), 1); G.discA.push(opt.a); }
  draw(G, who, 'P'); if (opt.a) draw(G, who, 'A');
}

// advance the replay until the human must choose, an intermission starts, or the game ends
export function advance(G) {
  G.pending = null;
  while (G.idx < G.game.events.length) {
    const ev = G.game.events[G.idx];
    if (ev.per > G.period) { G.phase = 'intermission'; return G; }
    const ro = options(G.rival.hand, ev);
    if (ro.length) applyPlay(G, G.rival, ro[0], ev);
    const mo = options(G.me.hand, ev);
    if (mo.length) {
      if (G.autoMe) applyPlay(G, G.me, mo[0], ev);
      else { G.phase = 'choose'; G.pending = { ev, opts: mo }; return G; }
    }
    G.idx++;
  }
  finish(G); return G;
}

export function choose(G, i) { // i = index into pending.opts, or -1 for "Play no cards"
  const { ev, opts } = G.pending;
  if (i >= 0) applyPlay(G, G.me, opts[i], ev);
  G.idx++;
  return advance(G);
}

export function swap(G, who, cards) { // cards: card objects in who's hand (max 5)
  const h = who.hand;
  let n = 0;
  for (const c of cards.slice(0, 5)) {
    const kind = c.f ? 'A' : 'P';
    const i = h[kind].indexOf(c); if (i < 0) continue;
    h[kind].splice(i, 1); (kind === 'P' ? G.discP : G.discA).push(c);
    if (h.line === c) h.line = null;
    draw(G, who, kind); n++;
  }
  return n;
}

export function endIntermission(G) {
  const ev = G.game.events[G.idx];
  G.period = ev.per;
  const h = G.rival.hand; // the Rival re-picks its Starting Line at random
  h.line = h.P.length ? h.P[Math.floor(G.rnd() * h.P.length)] : null;
  G.phase = 'play';
  return advance(G);
}

function finish(G) {
  G.phase = 'final';
  G.stars = G.game.stars;
  for (const who of [G.me, G.rival]) {
    who.starLog = [];
    const seen = new Set();
    const pool = [...who.hand.P, ...G.discP.filter(d => d.scoredBy === who.name)];
    for (const c of pool) {
      if (seen.has(c.n)) continue; seen.add(c.n);
      const inHand = who.hand.P.includes(c);
      const pts = starScore(c, G.stars, who.hand.line === c);
      if (pts) { who.bonus += pts; who.starLog.push({ n: c.n, pts }); }
    }
    who.final = who.score + who.bonus;
  }
}
