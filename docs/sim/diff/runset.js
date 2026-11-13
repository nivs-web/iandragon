'use strict';
// 고른 판만 여러 일꾼으로 :  node runset.js <스크립트(fit.js|refit.js|xcheck.js)> <hard|master> <일꾼 수> <g,g,…>
const { spawn } = require('child_process'), path = require('path'), os = require('os');
// PC 규칙(11/13 겜부장) : 계산은 한꺼번에 2개 이하 · 우선순위 낮게(BelowNormal) — 다른 직원 일이 멈추지 않게
const [script, mode, P, gs] = process.argv.slice(2), jobs = gs.split(',').map(Number), t0 = Date.now();
let running = 0;
(function next() {
  while (running < +P && jobs.length) {
    const g = jobs.shift(); running++;
    const c = spawn(process.execPath, [path.join(__dirname, script), mode, String(g)], { env: process.env });
    try { os.setPriority(c.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) {}
    c.stdout.on('data', d => process.stdout.write(d)); c.stderr.on('data', d => process.stdout.write('ERR ' + g + ' ' + d));
    c.on('close', () => { running--; if (!jobs.length && !running) console.log('== 끝 : ' + Math.round((Date.now() - t0) / 1000) + '초'); else next(); });
  }
})();
