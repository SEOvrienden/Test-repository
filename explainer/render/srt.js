// Schrijft captions.srt uit TIMELINE.captions (dezelfde bron als de ingebrande captions).
const T = require('../src/timeline.js');
const fmt = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(r).padStart(3, '0')}`; };
process.stdout.write(T.captions.map((c, i) => `${i + 1}\n${fmt(c.t0)} --> ${fmt(c.t1)}\n${c.text}\n`).join('\n'));
