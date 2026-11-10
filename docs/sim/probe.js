// 한 스테이지를 골라 자세히 들여다본다 :  node probe.js 1-5 [mag] [baseHp] [walletTarget] [seed]
'use strict';
const { simulate } = require('./engine');
const D = require('./data');
const { buildStage, refLoad } = require('./stages');
const [id, mag, baseHp, wt, seed, atkMag] = process.argv.slice(2);
const [w, s] = id.split('-').map(Number);
const st = buildStage(w, s);
let tuned = {}; try { tuned = require('./tuned.json'); } catch (e) {}
if (tuned[id]) { st.mag = tuned[id].mag; st.atkMag = tuned[id].atkMag; st.baseHp = tuned[id].baseHp; }
if (mag) st.mag = +mag; if (baseHp) st.baseHp = +baseHp; if (atkMag) st.atkMag = +atkMag;
const load = refLoad(st);
console.log(id, st.name, 'L=' + st.length, 'mag=' + st.mag, 'atk=' + (st.atkMag || st.mag), 'baseHp=' + st.baseHp, 'target=' + st.target, 'deck=' + load.deck.map(d => d.id + d.lv).join(','), 'leader=' + load.leader);
let next = 0;
const r = simulate(st, load, D, { walletTarget: wt == null ? 3 : +wt, useSkills: false }, seed ? +seed : 1, S => {
  if (S.t < next && !S.over) return; next = S.t + 5;
  const a = S.units.filter(u => u.alive && u.side === 0), e = S.units.filter(u => u.alive && u.side === 1);
  const af = a.length ? Math.max(...a.map(u => u.x)) : 0, ef = e.length ? Math.min(...e.map(u => u.x)) : S.L;
  const p = S.players[0];
  console.log(('t=' + S.t.toFixed(0)).padEnd(6), 'ally', String(a.length).padStart(2), 'front', String(Math.round(af)).padStart(4), '| enemy', String(e.length).padStart(2), 'front', String(Math.round(ef)).padStart(4),
    '| base', String(Math.round(S.base[0].hp / S.base[0].maxHp * 100)).padStart(3) + '%', 'vs', String(Math.round(Math.max(0, S.base[1].hp) / S.base[1].maxHp * 100)).padStart(3) + '%',
    '| $', String(Math.round(p.money)).padStart(4), 'wl', p.wl + 1, 'rage', Math.round(p.rage), S.boss && S.boss.alive ? 'BOSS ' + Math.round(S.boss.hp / S.boss.maxHp * 100) + '%' : '');
});
console.log(JSON.stringify({ ...r, players: undefined }, (k, v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v));
