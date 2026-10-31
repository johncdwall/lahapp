import { newGame, advance, choose, swap, endIntermission, setLine } from './game.js';
import { describe } from './engine.js';
import { DEMO } from './data/demo.js';
import { runCommand } from './commands.js';
import { listLocal, loadGame, listByDate } from './net.js';

const app = document.getElementById('app');
let G = null, ui = { out: '', prompt: '', screen: 'home', msg: '', games: [], sel: new Set(), more: false, copies: 1, auto: false, gid: '' };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const ord = n => ['', '1st', '2nd', '3rd', 'OT'][n] || `P${n}`;
const abbr = (t) => G && G.game.home.id === t ? G.game.home.abbrev : G && G.game.away.id === t ? G.game.away.abbrev : '';

function evText(ev) {
  const who = `#${ev.num} (${abbr(ev.team)}, ${ev.pos})`;
  const when = `${ord(ev.per)} ${ev.time}`;
  if (ev.kind === 'goal') return `<b>Goal</b> by ${who}${ev.strength !== 'EV' ? ' ' + ev.strength : ''}${ev.unassisted ? ', unassisted' : ''} · ${when}`;
  if (ev.kind === 'assist') return `<b>Assist</b> by ${who} · ${when}`;
  if (ev.kind === 'penalty') return `<b>Penalty</b> on ${who}: ${esc(ev.desc || ev.ptypeName || 'penalty')}${ev.unequal ? ' (unequal strength)' : ''} · ${when}`;
  return `<b>Icing</b> · ${when}`;
}
function pcard(p, G_, sel) {
  const line = G_.me.hand.line === p;
  const pen = p.activeType ? `${p.activeType} +${p.activeMult}x` : 'no penalty multiplier';
  return `<button class="c ${line ? 'line' : ''} ${sel ? 'sel' : ''}" data-p="${p.id}"><span class="n">#${p.n}</span> ${line ? '<span class="tag">STARTING LINE</span>' : ''}<br>G${p.g} A${p.a} PIM${p.pim}<br>${p.period} +${p.pmult}x<br>${esc(pen)}</button>`;
}
function acard(a, sel) {
  return `<button class="c ${sel ? 'sel' : ''}" data-a="${a.id}"><b>${esc(a.e)}</b><br>${a.f} · +${a.b}, +${a.m}x</button>`;
}
function board() {
  return `<div class="board"><div class="dim small">${esc(G.me.name)}<br><b>${G.me.score}</b></div><div class="dim small">${ord(G.period)} period<br>${G.idx}/${G.game.events.length} events</div><div class="dim small">${esc(G.rival.name)}<br><b>${G.rival.score}</b></div></div>`;
}
function handHtml(selectable) {
  const h = G.me.hand;
  return `<h2>Player Cards</h2><div class="hand">${h.P.map(p => pcard(p, G, ui.sel.has(p.id))).join('')}</div><h2>Action Cards</h2><div class="hand">${h.A.map(a => acard(a, ui.sel.has(a.id))).join('')}</div>`;
}
const byId = id => [...G.me.hand.P, ...G.me.hand.A].find(c => c.id === id);

function home() {
  return `<h1>Live Action Hockey</h1><p class="dim">Replay a game against the Rival. Prototype v0.</p>
  <button class="btn primary" id="demo">Play the demo game<small>Made-up game, works offline</small></button>
  <h2>Saved games</h2>${ui.games.length ? ui.games.map(g => `<button class="btn" data-id="${g.id}">${esc(g.title)}<small>${esc(g.date || '')} · ${g.id}</small></button>`).join('') : '<p class="dim small">None yet. Run the Fetch games action on GitHub, or load a game below.</p>'}
  <h2>Load from the NHL</h2><div class="row"><input id="gid" placeholder="Game id, e.g. 2026020106" value="${esc(ui.gid)}" inputmode="numeric"><input id="gdate" type="date"></div>
  <div class="row"><button class="btn" id="loadid">Load game id</button><button class="btn" id="loaddate">List games on date</button></div>
  <h2>Options</h2><div class="row"><select id="copies"><option value="1" ${ui.copies === 1 ? 'selected' : ''}>1 copy per number</option><option value="2" ${ui.copies === 2 ? 'selected' : ''}>2 copies per number</option></select></div>
  <label class="dim small"><input type="checkbox" id="auto" ${ui.auto ? 'checked' : ''} style="width:auto"> Auto-play my side (simulation)</label>
  ${ui.msg ? `<p class="err">${esc(ui.msg)}</p>` : ''}`;
}
function setup() {
  return `<h1>Your hand</h1><p class="dim small">Tap a Player Card to make it your Starting Line (its play counts double). Tap again to clear. You can change it once per intermission.</p>${board()}${handHtml()}<button class="btn primary" id="start">Start the game</button>${consoleHtml()}`;
}
function play() {
  const { ev, opts } = G.pending;
  const top = opts.slice(0, ui.more ? opts.length : 4);
  return `${board()}<div class="ev">${evText(ev)}</div>
  ${top.map((o, i) => `<button class="btn" data-o="${i}">${i + 1}. Score ${o.total} with ${esc(describe(o))}${o.onLine ? ' (Starting Line)' : ''}<small>${esc(o.math)}</small></button>`).join('')}
  ${!ui.more && opts.length > 4 ? `<button class="btn ghost" id="more">${opts.length - 4} more options</button>` : ''}
  <button class="btn ghost" data-o="-1">Play no cards</button>
  <details><summary class="dim small">My hand</summary>${handHtml()}</details>${consoleHtml()}${logHtml()}`;
}
function inter() {
  return `<h1>Intermission</h1><p class="dim small">Swap up to 5 cards (tap to select). Tap a Player Card again after the swap, or use "Set Starting Line", to choose your line.</p>${board()}${handHtml()}
  <button class="btn" id="swap">Swap selected (${ui.sel.size}/5)</button>
  <button class="btn" id="line">Set Starting Line: tap a Player Card first</button>
  <button class="btn primary" id="next">Start next period</button>${consoleHtml()}`;
}
function logHtml() {
  const rows = [...G.me.log].reverse().slice(0, 6).map(l => `<div class="log"><b>${l.total}</b> ${esc(l.what)} · ${ord(l.per)} ${l.time}<br><span class="dim">${esc(l.math)}</span></div>`).join('');
  return rows ? `<h2>My plays</h2>${rows}` : '';
}
function final() {
  const m = G.me, r = G.rival, w = m.final === r.final ? 'Tie' : m.final > r.final ? `${m.name} win` : `${r.name} win`;
  const bp = G.bestPlay ? `Biggest play: ${esc(G.bestPlay.who)}, ${esc(G.bestPlay.what)} for ${G.bestPlay.total} (${ord(G.bestPlay.per)} ${G.bestPlay.time}).` : '';
  const st = who => who.starLog.length ? ` Stars: ${who.starLog.map(s => `#${s.n} +${s.pts}`).join(', ')}.` : '';
  return `<h1>Final</h1>${board()}<div class="ev"><b>${w}.</b> ${esc(m.name)} ${m.final} (plays ${m.score}, stars ${m.bonus}) · ${esc(r.name)} ${r.final} (plays ${r.score}, stars ${r.bonus}).<br><span class="dim">${bp}${st(m)}</span></div>
  <h2>Your plays</h2>${m.log.map(l => `<div class="log"><b>${l.total}</b> ${esc(l.what)} · ${ord(l.per)} ${l.time}<br><span class="dim">${esc(l.math)}</span></div>`).join('') || '<p class="dim">No plays.</p>'}
  <button class="btn primary" id="again">Play again (new deal)</button><button class="btn ghost" id="homebtn">Home</button>${consoleHtml()}`;
}

function consoleHtml() {
  return `<h2>Commands</h2><form id="cmdform" class="row"><input id="cmd" placeholder="hand, 1, ok, more, swap P1, card 43, help" autocapitalize="none" autocorrect="off" enterkeyhint="send"><button class="btn primary" style="width:80px;margin:6px 0">Go</button></form>${ui.out ? `<pre class="out">${esc(ui.out)}</pre>` : ''}${ui.prompt ? `<pre class="out">${esc(ui.prompt)}</pre><button class="btn" id="copyp">Copy image prompt</button>` : ''}`;
}
let lastPbp = null;
function start(pbp) {
  lastPbp = pbp; ui.out = ''; ui.prompt = '';
  G = newGame(pbp, { copies: ui.copies });
  G.autoMe = ui.auto; ui.sel = new Set(); ui.more = false;
  if (G.autoMe) { advance(G); } else G.phase = 'setup';
  route();
}
function route() {
  const p = G ? G.phase : 'home';
  app.innerHTML = !G ? home() : p === 'setup' ? setup() : p === 'choose' ? play() : p === 'intermission' ? inter() : p === 'final' ? final() : play();
  wire();
}
function wire() {
  const $ = id => document.getElementById(id);
  const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
  if (!G) {
    on('demo', () => start(DEMO));
    app.querySelectorAll('[data-id]').forEach(b => b.onclick = () => go(b.dataset.id));
    on('loadid', () => { ui.gid = $('gid').value.trim(); if (ui.gid) go(ui.gid); });
    on('loaddate', async () => { const d = $('gdate').value; if (!d) return; try { ui.games = await listByDate(d); ui.msg = ui.games.length ? '' : 'No games that day.'; } catch (e) { ui.msg = 'Could not reach the NHL from this browser. Use the Fetch games action on GitHub instead.'; } route(); });
    $('copies').onchange = e => ui.copies = Number(e.target.value);
    $('auto').onchange = e => ui.auto = e.target.checked;
    return;
  }
  const cf = $('cmdform');
  if (cf) cf.onsubmit = e => {
    e.preventDefault(); const t = $('cmd').value; if (!t.trim()) return;
    const r = runCommand(G, t, ui);
    ui.out = `> ${t}\n${r.out}`; ui.prompt = r.prompt || '';
    if (r.next) { ui.sel = new Set(); endIntermission(G); }
    ui.sel = new Set(); route();
    const c = document.getElementById('cmd'); if (c) c.focus();
  };
  on('copyp', () => { try { navigator.clipboard.writeText(ui.prompt); ui.out = 'Prompt copied.'; } catch { ui.out = 'Copy failed. Select the text and copy it.'; } route(); });
  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const c = byId(b.dataset.p);
    if (G.phase === 'setup' || G.phase === 'intermission') {
      if (G.phase === 'setup') { setLine(G, G.me, G.me.hand.line === c ? null : c); route(); }
      else { ui.sel.has(c.id) ? ui.sel.delete(c.id) : (ui.sel.size < 5 && ui.sel.add(c.id)); ui.last = c; route(); }
    }
  });
  app.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    if (G.phase !== 'intermission') return;
    const c = byId(b.dataset.a); ui.sel.has(c.id) ? ui.sel.delete(c.id) : (ui.sel.size < 5 && ui.sel.add(c.id)); route();
  });
  on('start', () => { G.phase = 'play'; advance(G); route(); });
  app.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { ui.more = false; choose(G, Number(b.dataset.o)); route(); });
  on('more', () => { ui.more = true; route(); });
  on('swap', () => { const cards = [...ui.sel].map(byId).filter(Boolean); swap(G, G.me, cards); ui.sel = new Set(); route(); });
  on('line', () => { const sel = [...ui.sel].map(byId).filter(c => c && !c.f); if (sel.length === 1) { setLine(G, G.me, sel[0]); ui.sel = new Set(); } route(); });
  on('next', () => { ui.sel = new Set(); endIntermission(G); route(); });
  on('again', () => start(lastPbp));
  on('homebtn', () => { G = null; route(); });
}
async function go(id) {
  ui.msg = 'Loading...'; route();
  try { start(await loadGame(id)); ui.msg = ''; }
  catch (e) { ui.msg = `Could not load ${id}. If the NHL blocks this browser, run the Fetch games action on GitHub and reload.`; route(); }
}
listLocal().then(g => { ui.games = g; route(); });
route();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
