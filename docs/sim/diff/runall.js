'use strict';
// 100판 × 어려움 · 초고수를 한꺼번에 :  node runall.js [일꾼 수=11]   →  out/*.json · out/log.txt · out/timing.json
// 표본 30판(각 월드 1 · 5 · 10)을 대기열 맨 앞에 둔다 → 먼저 나온 표로 판단할 수 있다
// 이미 결과 파일이 있는 판은 건너뛴다(REDO=1 이면 다시). 키우기가 늘면 lib.js 의 BUILD · REC 만 고치고 REDO=1 로 다시 돌린다
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const P = +(process.argv[2] || 11), OUT = path.join(__dirname, process.env.OUT || 'out');
fs.mkdirSync(OUT, { recursive: true });
const sample = [], rest = [];
for (let g = 1; g <= 100; g++) ([1, 5, 0].includes(g % 10) ? sample : rest).push(g);
const phases = [['hard-sample', 'hard', sample], ['master-sample', 'master', sample], ['hard-rest', 'hard', rest], ['master-rest', 'master', rest]];
const jobs = [], left = {}, timing = { start: Date.now(), workers: P, phases: {} };
for (const [name, mode, gs] of phases) { left[name] = gs.length; for (const g of gs) jobs.push({ name, mode, g }); }
const log = fs.createWriteStream(path.join(OUT, 'log.txt'), { flags: 'a' });
let running = 0;
function next() {
  while (running < P && jobs.length) {
    const j = jobs.shift(); running++;
    if (!process.env.REDO && fs.existsSync(path.join(OUT, `${j.mode}-${j.g}.json`))) { setImmediate(() => done(j)); continue; }
    const c = spawn(process.execPath, [path.join(__dirname, 'fit.js'), j.mode, String(j.g)], { env: process.env });
    c.stdout.on('data', d => { log.write(d); process.stdout.write(d); });
    c.stderr.on('data', d => { log.write('ERR ' + j.mode + ' ' + j.g + ' ' + d); process.stdout.write(d); });
    c.on('close', () => done(j));
  }
}
function done(j) {
  running--;
  if (--left[j.name] === 0) {
    timing.phases[j.name] = Math.round((Date.now() - timing.start) / 1000);
    fs.writeFileSync(path.join(OUT, 'timing.json'), JSON.stringify(timing));
    console.log(`== ${j.name} 끝 : 시작 뒤 ${timing.phases[j.name]}초`);
  }
  if (!jobs.length && !running) {
    timing.total = Math.round((Date.now() - timing.start) / 1000);
    fs.writeFileSync(path.join(OUT, 'timing.json'), JSON.stringify(timing));
    log.end(); console.log('== 전부 끝 : ' + timing.total + '초');
  } else next();
}
next();
