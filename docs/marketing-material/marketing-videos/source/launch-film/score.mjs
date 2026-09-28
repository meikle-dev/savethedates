// Original score + sound design for the launch film, synthesised from scratch.
// Reads cue times exported by the composition (cues.json) so every hit lands on the picture.
//   node score.mjs cues.json out.wav
import fs from "node:fs";

const [cuesPath = "cues.json", outPath = "score.wav"] = process.argv.slice(2);
const { duration, speed = 1, cues } = JSON.parse(fs.readFileSync(cuesPath, "utf8"));
// The arrangement is written in composition seconds (96 BPM); T() maps them to playback time.
const K = 1 / speed;
const T = (x) => x * K;
const SR = 48000;
const LEN = Math.ceil(duration * SR);
const BEAT = 0.625 * K, BAR = 2.5 * K; // 96 BPM at full speed, 76.8 BPM at 0.8

// Buses (stereo)
const bus = () => [new Float32Array(LEN), new Float32Array(LEN)];
const dry = bus(), send = bus(), padBus = bus(), bassBus = bus(), drumBus = bus();
const duck = new Float32Array(LEN).fill(1);

let seed = 1234567;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noise = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const idx = (t) => Math.round(t * SR);
const panGains = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

function mixMono(target, i0, mono, pan = 0, gain = 1, sendTo = null, sendAmt = 0) {
  const [gl, gr] = panGains(pan);
  for (let k = 0; k < mono.length; k++) {
    const i = i0 + k;
    if (i < 0) continue;
    if (i >= LEN) break;
    const v = mono[k] * gain;
    target[0][i] += v * gl; target[1][i] += v * gr;
    if (sendTo) { sendTo[0][i] += v * gl * sendAmt; sendTo[1][i] += v * gr * sendAmt; }
  }
}

// RBJ biquad
class Biquad {
  constructor(type, f, q = 0.707) { this.type = type; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
  set(f, q = this.q) {
    this.q = q;
    const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, cs = Math.cos(w), a = Math.sin(w) / (2 * q);
    let b0, b1, b2; const a0 = 1 + a, a1 = -2 * cs, a2 = 1 - a;
    if (this.type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (this.type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = a; b1 = 0; b2 = -a; }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y;
  }
}

/* ---------------- instruments ---------------- */
function piano(t, midi, vel = 0.5, dur = 2.4, pan = null) {
  const f = mtof(midi), n = Math.floor((dur + 0.4) * SR), out = new Float32Array(n);
  const B = 0.00035;
  const bright = 0.6 + vel * 0.8;
  for (let h = 1; h <= 10; h++) {
    const fh = h * f * Math.sqrt(1 + B * h * h);
    if (fh > 16000) break;
    const amp = Math.pow(h, -1.7) * (h === 1 ? 1 : bright);
    const dec = 0.9 + h * 0.75 + f / 900;
    for (const det of [1, 1.0012]) {
      const w = 2 * Math.PI * fh * det / SR;
      let ph = rnd() * 6.28;
      for (let k = 0; k < n; k++) {
        const tt = k / SR;
        const env = Math.min(1, tt / 0.004) * Math.exp(-tt * dec) * (tt > dur ? Math.exp(-(tt - dur) * 14) : 1);
        out[k] += Math.sin(ph) * amp * env * 0.5;
        ph += w;
      }
    }
  }
  // hammer
  const hl = Math.floor(0.012 * SR), lp = new Biquad("lp", 2500);
  for (let k = 0; k < hl; k++) out[k] += lp.run(noise()) * 0.25 * (1 - k / hl) * vel;
  const p = pan ?? Math.max(-0.6, Math.min(0.6, (midi - 64) / 30));
  mixMono(dry, idx(t), out, p, vel * 0.32, send, 0.55);
}

function bell(t, midi, vel = 0.5, pan = 0, dur = 2.5) {
  const f = mtof(midi), n = Math.floor(dur * SR), out = new Float32Array(n);
  const partials = [[1, 1, 1.6], [2.0, 0.35, 2.4], [2.76, 0.28, 3.4], [5.4, 0.12, 6], [8.93, 0.05, 9]];
  for (const [r, a, d] of partials) {
    const w = 2 * Math.PI * f * r / SR; if (f * r > 18000) continue;
    for (let k = 0; k < n; k++) { const tt = k / SR; out[k] += Math.sin(w * k) * a * Math.min(1, tt / 0.002) * Math.exp(-tt * d); }
  }
  mixMono(dry, idx(t), out, pan, vel * 0.16, send, 0.8);
}

// wavetable for warm saw-ish pad
const WT = 4096, padTable = new Float32Array(WT);
for (let h = 1; h <= 24; h++) for (let k = 0; k < WT; k++) padTable[k] += Math.sin(2 * Math.PI * h * k / WT) * Math.pow(h, -1.9);
function pad(t0, t1, midis, gain = 0.5, attack = 0.9, release = 1.4) {
  const n = Math.floor((t1 - t0 + release) * SR), i0 = idx(t0);
  for (const m of midis) {
    for (const [det, pan] of [[-0.07, -0.55], [0, 0], [0.07, 0.55]]) {
      const f = mtof(m + det) , inc = f * WT / SR;
      let ph = rnd() * WT;
      const [gl, gr] = panGains(pan);
      for (let k = 0; k < n; k++) {
        const tt = k / SR, i = i0 + k; if (i >= LEN) break;
        let env = Math.min(1, tt / attack);
        if (tt > t1 - t0) env *= Math.max(0, 1 - (tt - (t1 - t0)) / release);
        const s = padTable[ph | 0] * env * gain * 0.05 * (1 + 0.15 * Math.sin(2 * Math.PI * 0.23 * (t0 + tt) + m));
        padBus[0][i] += s * gl; padBus[1][i] += s * gr;
        ph += inc; if (ph >= WT) ph -= WT;
      }
    }
  }
}

function bass(t, midi, dur, vel = 1) {
  const f = mtof(midi), n = Math.floor((dur + 0.15) * SR), i0 = idx(t);
  const w = 2 * Math.PI * f / SR;
  for (let k = 0; k < n; k++) {
    const tt = k / SR, i = i0 + k; if (i >= LEN) break;
    const env = Math.min(1, tt / 0.01) * (tt > dur ? Math.max(0, 1 - (tt - dur) / 0.15) : 1) * (0.75 + 0.25 * Math.exp(-tt * 4));
    const s = Math.tanh(1.6 * (Math.sin(w * k) + 0.25 * Math.sin(2 * w * k))) * env * vel * 0.2;
    bassBus[0][i] += s; bassBus[1][i] += s;
  }
}

function kick(t, vel = 1) {
  const n = Math.floor(0.55 * SR), out = new Float32Array(n);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    const f = 42 + 110 * Math.exp(-tt * 32);
    ph += 2 * Math.PI * f / SR;
    out[k] = Math.sin(ph) * Math.exp(-tt * 6.5) + (k < 90 ? noise() * 0.25 * (1 - k / 90) : 0);
  }
  mixMono(drumBus, idx(t), out, 0, 0.55 * vel);
  const i0 = idx(t);
  for (let k = 0; k < 0.4 * SR; k++) { const i = i0 + k; if (i < LEN) duck[i] = Math.min(duck[i], 1 - 0.45 * vel * Math.exp(-k / SR * 7)); }
}

function clap(t, vel = 1) {
  const n = Math.floor(0.3 * SR), out = new Float32Array(n), bp = new Biquad("bp", 1400, 0.9), hp = new Biquad("hp", 600);
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    let env = Math.exp(-tt * 18);
    for (const o of [0, 0.011, 0.022]) if (tt >= o && tt < o + 0.008) env = Math.max(env, 1.0);
    out[k] = hp.run(bp.run(noise())) * env;
  }
  mixMono(drumBus, idx(t), out, 0.05, 0.3 * vel, send, 0.5);
}

function shaker(t, vel = 1, pan = 0.25) {
  const n = Math.floor(0.07 * SR), out = new Float32Array(n), hp = new Biquad("hp", 7000), hp2 = new Biquad("hp", 7000);
  for (let k = 0; k < n; k++) { const tt = k / SR; out[k] = hp2.run(hp.run(noise())) * Math.min(1, tt / 0.006) * Math.exp(-tt * 55); }
  mixMono(drumBus, idx(t), out, pan, 0.12 * vel);
}

function whoosh(t, len = 0.8, vel = 1) {
  const pre = len * 0.75, post = 0.35, n = Math.floor((pre + post) * SR), out = new Float32Array(n);
  const bp = new Biquad("bp", 300, 1.2), lp = new Biquad("lp", 9000);
  for (let k = 0; k < n; k++) {
    const tt = k / SR - pre;
    if (k % 32 === 0) bp.set(tt < 0 ? 250 + 3800 * Math.pow(1 + tt / pre, 2.2) : 4050 - 3000 * Math.min(1, tt / post), 1.1);
    const env = tt < 0 ? Math.pow(1 + tt / pre, 2.6) : Math.exp(-tt * 9);
    out[k] = lp.run(bp.run(noise())) * env;
  }
  const i0 = idx(t - pre);
  const [l, r] = [new Float32Array(n), new Float32Array(n)];
  for (let k = 0; k < n; k++) { const p = Math.sin(k / n * Math.PI - Math.PI / 2) * 0.6; const [gl, gr] = panGains(p); l[k] = out[k] * gl; r[k] = out[k] * gr; }
  for (let k = 0; k < n; k++) { const i = i0 + k; if (i < 0 || i >= LEN) continue; dry[0][i] += l[k] * 0.55 * vel; dry[1][i] += r[k] * 0.55 * vel; send[0][i] += l[k] * 0.2 * vel; send[1][i] += r[k] * 0.2 * vel; }
}

function impact(t, vel = 1) {
  const n = Math.floor(2.2 * SR), out = new Float32Array(n), lp = new Biquad("lp", 900);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    ph += 2 * Math.PI * (34 + 40 * Math.exp(-tt * 9)) / SR;
    out[k] = Math.sin(ph) * Math.exp(-tt * 2.2) * 0.9 + lp.run(noise()) * Math.exp(-tt * 14) * 0.5;
  }
  mixMono(dry, idx(t), out, 0, 0.5 * vel, send, 0.35);
}

function click(t, vel = 1, freq = 2400, pan = 0) {
  const n = Math.floor(0.03 * SR), out = new Float32Array(n), bp = new Biquad("bp", freq, 2);
  for (let k = 0; k < n; k++) { const tt = k / SR; out[k] = (bp.run(noise()) * 1.4 + Math.sin(2 * Math.PI * freq * 0.6 * tt) * 0.3) * Math.exp(-tt * 180); }
  mixMono(dry, idx(t), out, pan, 0.22 * vel, send, 0.15);
}

function pop(t, f0 = 520, f1 = 1150, vel = 1, pan = 0.35) {
  const n = Math.floor(0.14 * SR), out = new Float32Array(n);
  let ph = 0;
  for (let k = 0; k < n; k++) { const tt = k / SR; ph += 2 * Math.PI * (f0 + (f1 - f0) * Math.min(1, tt / 0.05)) / SR; out[k] = Math.sin(ph) * Math.min(1, tt / 0.003) * Math.exp(-tt * 32); }
  mixMono(dry, idx(t), out, pan, 0.24 * vel, send, 0.4);
}

function swipe(t, vel = 1) {
  const n = Math.floor(0.2 * SR), out = new Float32Array(n), bp = new Biquad("bp", 2000, 1.5);
  for (let k = 0; k < n; k++) { const tt = k / SR; if (k % 32 === 0) bp.set(1800 + 4000 * tt / 0.2, 1.5); out[k] = bp.run(noise()) * Math.sin(Math.PI * Math.min(1, tt / 0.2)) ; }
  mixMono(dry, idx(t), out, -0.4, 0.2 * vel, send, 0.2);
}

function riser(t0, t1) {
  const n = Math.floor((t1 - t0) * SR), out = new Float32Array(n), bp = new Biquad("bp", 400, 1.4);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const x = k / n;
    if (k % 32 === 0) bp.set(400 + 6000 * x * x, 1.4);
    ph += 2 * Math.PI * (220 * Math.pow(4, x)) / SR;
    out[k] = (bp.run(noise()) * 0.8 + Math.sin(ph) * 0.08) * Math.pow(x, 2.4);
  }
  mixMono(dry, idx(t0), out, 0, 0.45, send, 0.5);
}

/* ---------------- harmony ---------------- */
const CH = {
  Dmaj7: { root: 38, pad: [50, 57, 61, 66], arp: [62, 66, 69, 73] },
  "A/C#": { root: 37, pad: [49, 57, 61, 64], arp: [61, 64, 69, 73] },
  Bm7: { root: 35, pad: [47, 54, 57, 62], arp: [59, 62, 66, 69] },
  Gmaj7: { root: 31, pad: [43, 54, 59, 62], arp: [59, 62, 66, 71] },
  Em7: { root: 40, pad: [52, 55, 59, 62], arp: [59, 62, 64, 67] },
  Asus: { root: 33, pad: [45, 52, 57, 62], arp: [57, 62, 64, 69] },
  A: { root: 33, pad: [45, 52, 57, 61], arp: [57, 61, 64, 69] },
  Dmaj9: { root: 38, pad: [50, 57, 64, 66, 69, 73], arp: [62, 66, 69, 76] },
};
const PROG = ["Dmaj7", "A/C#", "Bm7", "Gmaj7", "Dmaj7", "A/C#", "Bm7", "Gmaj7", "Dmaj7", "A/C#", "Bm7", "Gmaj7", "Em7", "A", "Bm7", "Gmaj7", "Asus", "Dmaj9", "Dmaj9"];
const FINALE = T(42.5), DROP = T(38.75);

// Pad: every bar until the finale chord, which sustains.
PROG.forEach((name, b) => {
  const t0 = b * BAR;
  if (t0 >= FINALE) return;
  const c = CH[name];
  pad(t0, t0 + BAR, c.pad, b < 2 ? 0.5 : 0.62, b === 0 ? 2.2 : 0.35, 0.6);
});
pad(FINALE, duration, CH.Dmaj9.pad, 0.75, 0.05, 1.2);

// Piano: intro chords, then an eighth-note arpeggio from bar 2.
piano(T(0.05), 62, 0.28, 4.5 * K, -0.2);
piano(T(2.1), 50, 0.4, 3 * K); piano(T(2.1), 57, 0.38, 3 * K); piano(T(2.1), 66, 0.42, 3 * K); piano(T(2.12), 73, 0.34, 3 * K);
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
for (let t = 2 * BAR; t < FINALE - 0.01; t += BEAT / 2) {
  const b = Math.floor(t / BAR + 1e-6), c = CH[PROG[b]];
  const step = Math.round((t - b * BAR) / (BEAT / 2));
  let vel = step % 2 === 0 ? 0.42 : 0.3;
  if (b < 4) vel *= 0.8;
  if (t >= DROP && t < T(40.0)) vel *= 0.7;
  piano(t, c.arp[ARP[step % 8]], vel, 0.9);
}
// sixteenths into the finale
for (let t = T(40.625); t < FINALE - 0.01; t += BEAT / 4) {
  const k = Math.round((t - T(40.625)) / (BEAT / 4));
  piano(t, CH.Asus.arp[k % 4] + 12 * Math.floor(k / 8), 0.22 + k * 0.012, 0.35);
}
// finale chord
[38, 50, 57, 64, 66, 69, 73, 78].forEach((m, i) => piano(FINALE + i * 0.012, m, 0.55, duration - FINALE - 0.6));
bell(FINALE, 81, 0.9, 0.2, 4.5); bell(FINALE + BEAT / 2, 86, 0.6, -0.3, 4); bell(FINALE + BEAT * 1.5, 90, 0.4, 0.4, 3.5);

// Bass from bar 2 (soft) and full from bar 4
for (let b = 2; b < 17; b++) {
  const t = b * BAR, c = CH[PROG[b]];
  if (t >= DROP && t < T(40)) continue;
  const v = b < 4 ? 0.55 : 1;
  bass(t, c.root, BEAT * 1.5 - 0.05, v);
  bass(t + BEAT * 1.5, c.root, BEAT - 0.05, v * 0.8);
  bass(t + BEAT * 2.5, c.root + 12, BEAT * 0.5, v * 0.55);
  bass(t + BEAT * 3, c.root, BEAT - 0.05, v * 0.85);
}
bass(T(40), 33, T(2.4), 1);
bass(FINALE, 26, duration - FINALE, 1.1);

// Drums
for (let t = 2 * BAR; t < FINALE - 0.01; t += BEAT / 2) {
  const beatIdx = Math.round(t / BEAT * 2);       // eighth-note index
  const inBar = beatIdx % 8;
  const full = t >= 4 * BAR && t < DROP;
  const intro = t < 4 * BAR;
  const drop = t >= DROP;
  if (inBar === 0 || inBar === 4) kick(t, intro ? 0.55 : drop ? 0.85 : 1);
  if (full && inBar === 3 && (beatIdx / 8 | 0) % 2 === 1) kick(t, 0.6);
  if (full && (inBar === 2 || inBar === 6)) clap(t, 0.9);
  if (!drop || t > T(40.6)) {
    shaker(t, (inBar % 2 ? 1 : 0.55) * (intro ? 0.55 : 1), 0.3);
    if (full) shaker(t + BEAT / 4, 0.4, -0.3);
  }
}

/* ---------------- sound design from cues ---------------- */
const themeNotes = [74, 78, 81, 85, 76, 81, 85, 88, 93, 88, 85, 81];
for (const c of cues) {
  switch (c.type) {
    case "rollStart": {
      // odometer ticks that slow down as the digits land
      let t = c.t, gap = 0.028 * K;
      while (t < T(2.08)) { click(t, 0.5 + rnd() * 0.3, 3200 + rnd() * 800, (rnd() - 0.5) * 0.6); t += gap; gap *= 1.075; }
      break;
    }
    case "land": bell(c.t, 81, 0.7, 0.1, 3.5); impact(c.t, 0.35); break;
    case "whoosh": whoosh(c.t, c.len ?? 0.8, 0.9); break;
    case "rise": whoosh(c.t + 0.25, 0.6, 0.45); break;
    case "theme": bell(c.t, themeNotes[c.i], c.i < 5 ? 0.8 : 0.6, c.i % 2 ? 0.45 : -0.45, 2.2); if (c.i > 0) swipe(c.t - 0.08, c.i < 5 ? 0.8 : 0.5); break;
    case "impact": impact(c.t, c.soft ? 0.7 : 1); if (!c.soft) bell(c.t, 86, 0.6, 0, 3); break;
    case "swap": bell(c.t, [81, 85, 88][c.k], 0.6, 0.3, 2); swipe(c.t - 0.1, 0.6); break;
    case "type": { let t = c.t; while (t < c.end) { click(t, 0.35 + rnd() * 0.25, 1600 + rnd() * 900, -0.2 + rnd() * 0.2); t += 0.045 + rnd() * 0.05; } break; }
    case "tap": click(c.t, 1.1, 1300, 0); pop(c.t, 900, 700, 0.35, 0); break;
    case "pop": pop(c.t, 480, 1100, 1, 0.35); break;
    case "pop2": pop(c.t, 620, 1250, 0.9, -0.2); break;
    case "strike": swipe(c.t, 1); break;
    case "ding": bell(c.t, 86, 0.8, 0.15, 3); bell(c.t + 0.14, 93, 0.55, -0.15, 3); break;
    case "count": { let t = c.t, g = 0.035; while (t < c.end) { click(t, 0.4 * (1 - (t - c.t) / (c.end - c.t)) + 0.1, 3600, 0.3); t += g; g *= 1.06; } break; }
    case "pill": pop(c.t, 700, 900, 0.5, (rnd() - 0.5) * 0.8); break;
    case "riser": riser(c.from, c.t); break;
    case "finale": impact(c.t, 1); whoosh(c.t, 1.2, 0.5); break;
  }
}

/* ---------------- reverb (Freeverb) ---------------- */
function freeverb(inp, room = 0.86, damp = 0.25) {
  const scale = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225];
  const out = bus();
  for (let ch = 0; ch < 2; ch++) {
    const spread = ch ? 23 : 0;
    const combs = combT.map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0, store: 0 }));
    const aps = apT.map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0 }));
    const x = inp[ch], y = out[ch];
    // pre-delay 22 ms
    const pd = Math.round(0.022 * SR);
    for (let n = 0; n < LEN; n++) {
      const s = (n >= pd ? x[n - pd] : 0) * 0.015;
      let acc = 0;
      for (const c of combs) {
        const o = c.buf[c.i];
        c.store = o * (1 - damp) + c.store * damp;
        c.buf[c.i] = s + c.store * room;
        if (++c.i >= c.buf.length) c.i = 0;
        acc += o;
      }
      for (const a of aps) {
        const b = a.buf[a.i];
        a.buf[a.i] = acc + b * 0.5;
        acc = b - acc;
        if (++a.i >= a.buf.length) a.i = 0;
      }
      y[n] = acc;
    }
  }
  return out;
}
// pad also feeds the reverb gently
for (let ch = 0; ch < 2; ch++) for (let n = 0; n < LEN; n++) send[ch][n] += padBus[ch][n] * 0.35;
const wet = freeverb(send);

/* ---------------- master ---------------- */
const master = bus();
const hpL = new Biquad("hp", 28), hpR = new Biquad("hp", 28);
for (let n = 0; n < LEN; n++) {
  const d = duck[n];
  for (let ch = 0; ch < 2; ch++) {
    master[ch][n] = dry[ch][n] + wet[ch][n] * 1.1 + padBus[ch][n] * (0.55 + 0.45 * d) + bassBus[ch][n] * d + drumBus[ch][n];
  }
  master[0][n] = hpL.run(master[0][n]); master[1][n] = hpR.run(master[1][n]);
}
// gentle bus glue: slow RMS compressor + soft clip
let env = 0;
const att = Math.exp(-1 / (0.01 * SR)), rel = Math.exp(-1 / (0.25 * SR));
let peak = 0;
for (let n = 0; n < LEN; n++) {
  const lvl = Math.max(Math.abs(master[0][n]), Math.abs(master[1][n]));
  env = lvl > env ? att * env + (1 - att) * lvl : rel * env + (1 - rel) * lvl;
  const thr = 0.5, g = env > thr ? Math.pow(thr / env, 0.35) : 1;
  for (let ch = 0; ch < 2; ch++) { master[ch][n] = Math.tanh(master[ch][n] * g * 1.2) / 1.2; peak = Math.max(peak, Math.abs(master[ch][n])); }
}
const norm = Math.pow(10, -1 / 20) / peak;
const fadeOut = 1.3 * SR;
const pcm = Buffer.alloc(LEN * 4);
let sumSq = 0;
for (let n = 0; n < LEN; n++) {
  let f = 1;
  if (n < 0.02 * SR) f = n / (0.02 * SR);
  if (n > LEN - fadeOut) f = Math.pow((LEN - n) / fadeOut, 1.5);
  for (let ch = 0; ch < 2; ch++) {
    const v = master[ch][n] * norm * f;
    sumSq += v * v;
    const dither = (rnd() - rnd()) / 32768;
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round((v + dither) * 32767))), (n * 2 + ch) * 2);
  }
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write("WAVE", 8); hdr.write("fmt ", 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write("data", 36); hdr.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(outPath, Buffer.concat([hdr, pcm]));
console.log(`wrote ${outPath}  ${duration}s  peak-norm ${norm.toFixed(2)}  rms ${(10 * Math.log10(sumSq / (LEN * 2))).toFixed(1)} dBFS`);
