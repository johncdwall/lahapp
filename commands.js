// Text commands for the LAH app. Same short commands as the dealer package.
import { PLAYERS, ACTIONS } from './data/cards.js';
import { describe } from './engine.js';
import { choose, swap, setLine, advance } from './game.js';

const ALIAS = { hd: 'hand', h: 'hand', rv: 'rival', sc: 'score', s: 'score', up: 'update', u: 'update', ic: 'icing', i: 'icing',
  pn: 'penalty', p: 'penalty', gl: 'goal', g: 'goal', tm: 'time', t: 'time', lg: 'log', ro: 'roster', sw: 'swap', wh: 'who',
  pl: 'player', cd: 'card', fc: 'fcard', ffc: 'ffcard', mo: 'more', sg: 'sog', hp: 'help', '?': 'help', ng: 'nugget', nug: 'nugget', st: 'stats', ok: 'ok' };
const TEAMS = ['Kissimmee Slap Shots', 'Boise Blue Liners', 'Tulsa Tape Jobs', 'Fargo Five-Holes', 'Peoria Penalty Box', 'Duluth Dangle Dogs', 'Reno Breakaways', 'Sioux Falls Zambonis', 'Wichita Wrist Shots', 'Erie Empty Nets'];
const ord = n => ['', '1st', '2nd', '3rd', 'OT'][n] || `P${n}`;
const NA = 'Not available in the replay app yet.';

export function teamName(G) { return G.teamName || (G.teamName = TEAMS[Math.floor(Math.random() * TEAMS.length)]); }
const pLabel = (p, i, G, h) => `P${i + 1}: #${p.n}  G${p.g} A${p.a} PIM${p.pim}  ${p.period} +${p.pmult}x  ${p.activeType ? p.activeType + ' +' + p.activeMult + 'x' : 'no penalty mult'}${h.line === p ? '  [STARTING LINE]' : ''}`;
const aLabel = (a, i) => `A${i + 1}: ${a.f} ${a.e}  ${a.b} pts, +${a.m}x`;
function handText(G, who) {
  const h = who.hand;
  return `${who.name}: ${who.score}${who.name === G.me.name ? '' : ' (face-up)'}\n${h.P.map((p, i) => pLabel(p, i, G, h)).join('\n')}\n${h.A.map(aLabel).join('\n')}${h.P.length > 5 ? '\nNote: more than five Player Cards in hand.' : ''}\nIce Cards play on an icing call with any Player Card, never on a penalty.`;
}
function optsText(G, all) {
  const { ev, opts } = G.pending;
  const list = opts.slice(0, all ? opts.length : 4).map((o, i) => `${i + 1}. Score ${o.total} with ${describe(o)}${o.onLine ? ' (Starting Line)' : ''}   ${o.math}`);
  const rest = !all && opts.length > 4 ? `\n${opts.length - 4} more options, say more` : '';
  return `${evLine(G, ev)}\n${list.join('\n')}${rest}\n0. Play no cards`;
}
export function evLine(G, ev) {
  const ab = t => G.game.home.id === t ? G.game.home.abbrev : G.game.away.id === t ? G.game.away.abbrev : '';
  const w = `#${ev.num} (${ab(ev.team)}, ${ev.pos})`, when = `${ord(ev.per)} ${ev.time}`;
  if (ev.kind === 'goal') return `Goal by ${w}${ev.strength !== 'EV' ? ' ' + ev.strength : ''}${ev.unassisted ? ', unassisted' : ''}, ${when}`;
  if (ev.kind === 'assist') return `Assist by ${w}, ${when}`;
  if (ev.kind === 'penalty') return `Penalty on ${w}: ${ev.desc || 'penalty'}${ev.unequal ? ' (unequal strength)' : ''}, ${when}`;
  return `Icing, ${when}`;
}
function find(G, tok) {
  const m = /^([pa])(\d+)$/i.exec(tok); const h = G.me.hand;
  if (m) return (m[1].toLowerCase() === 'p' ? h.P : h.A)[Number(m[2]) - 1] || null;
  if (/^\d+$/.test(tok)) return h.P.find(p => p.n === Number(tok)) || null;
  return null;
}
function played(G, i, before) {
  const g = G.me.log[G.me.log.length - 1];
  return `Played: ${g.what} for ${g.total}. ${g.math}\nYour total: ${G.me.score}. Rival: ${G.rival.score}.${G.phase === 'intermission' ? '\nIntermission. swap, line, then next.' : G.phase === 'final' ? '\nGame over.' : ''}`;
}
function actionRows(q) {
  q = q.toLowerCase();
  return ACTIONS.filter(a => `${a.f} ${a.e}`.toLowerCase().includes(q) || a.e.toLowerCase().includes(q));
}
const STYLE = "A vertical trading card, ice hockey theme, painterly comic-book illustration with rich brushwork, dramatic textures, high-contrast, thin rounded border, portrait ratio 5:7.";
function playerPrompt(G, mode, n) {
  const h = G.me.hand.P.find(p => p.n === n); const base = PLAYERS.find(p => p.n === n);
  const p = h || base; if (!p) return null;
  const stars = Array.isArray(p.stars) ? p.stars.join(' / ') : '';
  const pen = h && h.activeType ? `${h.activeType} +${h.activeMult}x` : (() => { const k = Object.entries(p.pen || {}).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1])[0]; return k ? `${k[0]} +${k[1]}x` : 'none'; })();
  const team = teamName(G);
  const roster = G.game.roster.filter(r => r.n === n);
  const goalie = roster.some(r => r.pos === 'G');
  const visor = 'helmet with a clear eye visor over the eyes and NOT a full face cage or full face mask';
  const fem = "an adult female hockey player with a voluptuous, curvy athletic build, hair one of blond, brown, dark blond, auburn or black, bold makeup and long hair";
  let art;
  if (goalie) art = `Art: a hockey goalie in full goalie equipment: large leg pads, chest protector, goalie mask, catching glove (trapper), blocker and goalie stick, in a crouched ready stance in the crease in front of the net, a puck in play, wearing the number ${n}, in a full jersey for ${team}, no real person's exact likeness.`;
  else if (mode === 'card') art = `Art: a hockey player in a full jersey for ${team} (same invented colors and crest for every card of that team), wearing a ${visor}, face clearly visible, showing the number ${n}, dynamic skating pose on ice with stick and puck, no real person's exact likeness.`;
  else if (mode === 'fcard') art = `Art: ${fem}, fully dressed in a complete hockey uniform (full jersey for ${team}, pants, gloves, helmet with no face shield, no visor and no face guard of any kind, face fully visible, or ponytail), safe for work, non-nude, no revealing or suggestive clothing or pose, dynamic skating pose on ice with stick and puck, showing the number ${n}, no real person's exact likeness.`;
  else art = `Art: ${fem}, sexy but not explicit, fully dressed in a feminized hockey uniform (full jersey for ${team}, skirt, gloves, helmet with no face shield, no visor and no face guard of any kind, face fully visible, or ponytail), safe for work, non-nude, flirty clothing and pose, dynamic skating pose on ice with stick and puck, showing the number ${n}, no real person's exact likeness.`;
  return `${STYLE} Top left: large bold jersey number. Top center: printed stats 'G ${p.g}  A ${p.a}  PIM ${p.pim}  STARS ${stars}'. Top right banner: 'PERIOD ${p.period} +${p.pmult}x'. ${art} Bottom bar: 'PENALTY MULTIPLIER ${pen}'. Small footer: '${goalie ? 'PLAYER  GOALIE' : 'PLAYER'}'.`;
}
function actionPrompt(a, mode) {
  const who = mode === 'card' ? '' : ' Include only female characters.';
  return `${STYLE} Top banner: '${a.f.toUpperCase()}'. Large centered title: '${a.e.toUpperCase()}'. Art: a dramatic scene of the event, no real person's likeness, no team logos.${who} Bottom bar: '${a.b} pts  +${a.m}x'. Small footer: 'ACTION'.`;
}
function cardCmd(G, mode, arg) {
  if (!arg) return `Usage: ${mode} <player number> or ${mode} <action card name>`;
  if (/^\d+$/.test(arg)) { const t = playerPrompt(G, mode, Number(arg)); return t ? { prompt: t } : `No Player Card for #${arg}.`; }
  const rows = actionRows(arg);
  if (!rows.length) return `No Action Card matches "${arg}".`;
  if (rows.length > 1) {
    G.cmdCtx = { mode, rows };
    return `Several match. Reply with a number:\n${rows.map((a, i) => `${i + 1}. ${a.f} ${a.e}, ${a.b} pts, +${a.m}x`).join('\n')}`;
  }
  return { prompt: actionPrompt(rows[0], mode) };
}

const HELP = `hand (hd, h)  your cards
rival (rv)  Rival cards
score (sc, s)  totals and plays
log (lg)  your plays
update (up, u)  show the current event options
goal (gl, g) / penalty (pn, p) / icing (ic, i)  show options if that event is current
more (mo)  list all options
1, 2, 3...  choose an option; ok = option 1; 0 = play no cards
swap (sw) P1 A3 ...  intermission exchange, up to 5 cards
line P2 (or a number)  set Starting Line
next  start the next period (intermission)
time (tm)  replay position and real score
who (wh) 43  real players wearing that number
card (cd) 43 | card slashing  image prompt
fcard (fc), ffcard (ffc)  female art versions
team <name>  your team name for card prompts
help (hp, ?)  this list`;

// returns { out, prompt? , redraw }
export function runCommand(G, raw, ui) {
  const text = raw.trim(); if (!text) return { out: '' };
  const [w0, ...rest] = text.split(/\s+/); const arg = rest.join(' ');
  let w = w0.toLowerCase(); w = ALIAS[w] || w;
  const R = (out, extra = {}) => ({ out, redraw: true, ...extra });

  if (/^\d+$/.test(w)) {
    const n = Number(w);
    if (G.cmdCtx) { const c = G.cmdCtx; G.cmdCtx = null; const a = c.rows[n - 1]; return a ? R('', { prompt: actionPrompt(a, c.mode) }) : R('Not a valid choice.'); }
    if (G.phase !== 'choose') return R('Nothing to choose right now.');
    const { opts } = G.pending;
    if (n === 0) { choose(G, -1); return R(played2(G, 'Played no cards.')); }
    if (n < 1 || n > opts.length) return R(`Choose 1 to ${opts.length}, or 0 for no cards.`);
    ui.more = false; choose(G, n - 1); return R(played(G));
  }
  if (w === 'ok') { if (G.phase !== 'choose') return R('Nothing to choose right now.'); ui.more = false; choose(G, 0); return R(played(G)); }
  switch (w) {
    case 'help': return R(HELP);
    case 'hand': return R(handText(G, G.me));
    case 'rival': return R(handText(G, G.rival));
    case 'score': return R(`${G.me.name} ${G.me.score}   ${G.rival.name} ${G.rival.score}\n` + [...G.me.log].map(l => `${l.total}  ${l.what}  ${ord(l.per)} ${l.time}  ${l.math}`).join('\n'));
    case 'log': return R(G.me.log.length ? G.me.log.map(l => `${l.total}  ${l.what}  ${ord(l.per)} ${l.time}  ${l.math}`).join('\n') : 'No plays yet.');
    case 'more': if (G.phase !== 'choose') return R('No options showing.'); ui.more = true; return R(optsText(G, true));
    case 'update': case 'goal': case 'penalty': case 'icing': {
      if (G.phase === 'setup') return R('Start the game first (Start the game button).');
      if (G.phase === 'intermission') return R('Intermission. swap, line, then next.');
      if (G.phase === 'final') return R('Game over.');
      const k = { goal: ['goal', 'assist'], penalty: ['penalty'], icing: ['icing'] }[w];
      if (k && !k.includes(G.pending.ev.kind)) return R(`The current event is: ${evLine(G, G.pending.ev)}. No ${w} pending.`);
      return R(optsText(G, false));
    }
    case 'next': if (G.phase !== 'intermission') return R('Not at an intermission.'); ui.next = true; return R('Next period.', { next: true });
    case 'swap': {
      if (G.phase !== 'intermission' && G.phase !== 'setup') return R('Exchanges happen at intermission.');
      if (!arg) return R('Usage: swap P1 A3 P5 (up to 5 cards). Use hand to see labels.');
      const cards = [...new Set(rest.map(t => find(G, t.toLowerCase())).filter(Boolean))];
      if (!cards.length) return R('No matching cards. Use labels like P1 or A3.');
      const n = swap(G, G.me, cards); return R(`Swapped ${n}.\n` + handText(G, G.me));
    }
    case 'line': {
      const c = find(G, arg.toLowerCase()); if (!c || c.f) return R('Usage: line P2 or line 43');
      if (G.phase !== 'intermission' && G.phase !== 'setup') return R('You can change the Starting Line at intermission.');
      setLine(G, G.me, c); return R(`Starting Line: #${c.n}`);
    }
    case 'time': {
      const evs = G.game.events, cur = G.pending ? G.pending.ev : evs[Math.min(G.idx, evs.length - 1)];
      let h = 0, a = 0; for (let i = 0; i < G.idx && i < evs.length; i++) if (evs[i].kind === 'goal') (evs[i].team === G.game.home.id ? h++ : a++);
      return R(`Replay at ${ord(cur.per)} ${cur.time}. Real score: ${G.game.away.abbrev} ${a}, ${G.game.home.abbrev} ${h}. Event ${Math.min(G.idx + 1, evs.length)} of ${evs.length}.`);
    }
    case 'who': {
      const n = Number(arg); if (!n) return R('Usage: who 43');
      const r = G.game.roster.filter(x => x.n === n);
      return R(r.length ? r.map(x => `#${n}: ${x.name || '?'} (${x.team === G.game.home.id ? G.game.home.abbrev : G.game.away.abbrev}, ${x.pos})`).join('\n') : `Nobody dressed wears #${n}.`);
    }
    case 'team': if (!arg) return R(`Team name: ${teamName(G)}`); G.teamName = arg; return R(`Team name: ${arg}`);
    case 'card': case 'fcard': case 'ffcard': { const r = cardCmd(G, w, arg); return typeof r === 'string' ? R(r) : R('', r); }
    case 'roster': case 'player': case 'nugget': case 'stats': case 'sog': return R(NA);
    default: return R(`Unknown command "${w0}". Type help.`);
  }
}
function played2(G, t) { return `${t}\nYour total: ${G.me.score}. Rival: ${G.rival.score}.${G.phase === 'intermission' ? '\nIntermission. swap, line, then next.' : G.phase === 'final' ? '\nGame over.' : ''}`; }
