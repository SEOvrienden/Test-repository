// Render-motor: headless Chrome zet t = n/fps, pipet frames naar ffmpeg.
// Gebruik:
//   node render/render.js video  --f wide|tall|square [--rm] [--fps 60] [--workers 2] --out out/x.mp4
//   node render/render.js stills --f wide [--rm] --times 1,2.5 --out stills/dir [--prefix name]
//   node render/render.js audio  --out build/bed_raw.wav
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TIMELINE = require(path.join(SRC, 'timeline.js'));
const SIZES = { wide: [1920, 1080], tall: [1080, 1920], square: [1080, 1080] };

function args() {
  const a = process.argv.slice(2); const o = { cmd: a[0] };
  for (let i = 1; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; o[k] = v;
  }
  return o;
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf' };
  const srv = http.createServer((req, res) => {
    const p = path.join(SRC, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(SRC) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(browser, port, f, rm) {
  const [w, h] = SIZES[f];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('pageerror', e); process.exitCode = 1; });
  await page.goto(`http://127.0.0.1:${port}/film.html?f=${f}${rm ? '&rm=1' : ''}`);
  await page.evaluate(() => window.ready);
  return { page, w, h };
}

async function frame(page, w, h, t) {
  await page.evaluate((tt) => window.seek(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h }, animations: 'disabled' });
}

function ffmpegPipe(out, fps, w, h, extra = []) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), ...extra, out], { stdio: ['pipe', 'inherit', 'inherit'] });
  return ff;
}
const write = (s, buf) => new Promise((r) => (s.write(buf) ? r() : s.once('drain', r)));
const done = (p) => new Promise((r, j) => p.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));

async function main() {
  const o = args();
  const srv = await serve(); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  try {
    if (o.cmd === 'stills') {
      const { page, w, h } = await openPage(browser, port, o.f || 'wide', !!o.rm);
      fs.mkdirSync(o.out, { recursive: true });
      const times = o.times === 'beats' ? TIMELINE.beats.map((b) => b.t) : String(o.times).split(',').map(Number);
      const ids = o.times === 'beats' ? TIMELINE.beats.map((b) => b.id) : times.map((t) => 't' + t.toFixed(3));
      for (let i = 0; i < times.length; i++) {
        const png = await frame(page, w, h, times[i]);
        fs.writeFileSync(path.join(o.out, `${o.prefix || o.f || 'wide'}_${ids[i]}.png`), png);
      }
    } else if (o.cmd === 'video') {
      const f = o.f || 'wide'; const fps = +(o.fps || 60); const workers = +(o.workers || 2);
      const total = Math.round(TIMELINE.duration * fps);
      const tmp = path.join(ROOT, 'build', `seg_${f}${o.rm ? '_rm' : ''}_${fps}`); fs.mkdirSync(tmp, { recursive: true });
      const per = Math.ceil(total / workers); const t0 = Date.now();
      await Promise.all(Array.from({ length: workers }, async (_, k) => {
        const a = k * per, b = Math.min(total, a + per);
        const { page, w, h } = await openPage(browser, port, f, !!o.rm);
        const ff = ffmpegPipe(path.join(tmp, `seg${k}.mp4`), fps, w, h);
        for (let n = a; n < b; n++) {
          await write(ff.stdin, await frame(page, w, h, n / fps));
          if (k === 0 && n % (fps * 5) === 0) console.log(`${f}${o.rm ? ' rm' : ''}: ${Math.round((n - a) / (b - a) * 100)}% (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
        }
        ff.stdin.end(); await done(ff); await page.close();
      }));
      const list = path.join(tmp, 'list.txt');
      fs.writeFileSync(list, Array.from({ length: workers }, (_, k) => `file 'seg${k}.mp4'`).join('\n'));
      fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
      await done(spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', o.out], { stdio: 'inherit' }));
      console.log(`klaar: ${o.out} (${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    } else if (o.cmd === 'audio') {
      const { page } = await openPage(browser, port, 'wide', false);
      const { sr, b64 } = await page.evaluate(() => window.renderAudioB64());
      const data = Buffer.from(b64, 'base64');
      const hdr = Buffer.alloc(44);
      hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
      hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(sr, 24);
      hdr.writeUInt32LE(sr * 8, 28); hdr.writeUInt16LE(8, 32); hdr.writeUInt16LE(32, 34); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
      fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
      fs.writeFileSync(o.out, Buffer.concat([hdr, data]));
      console.log('audio', o.out, (data.length / 8 / sr).toFixed(2) + 's');
    }
  } finally { await browser.close(); srv.close(); }
}
main().catch((e) => { console.error(e); process.exit(1); });
