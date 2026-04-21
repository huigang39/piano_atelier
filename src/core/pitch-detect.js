/**
 * 音高检测
 * ---------------------------
 * - autoCorrelate: 纯函数，基于自相关 + 抛物线插值
 * - PitchDetector: 封装麦克风管道，通过回调发出检测结果
 */

import { freqToMidi, midiToNoteName, centsOff } from './music-theory.js';

/**
 * 自相关音高检测
 * @param {Float32Array} buf - 时域样本 [-1, 1]
 * @param {number} sampleRate
 * @returns {{freq: number, clarity: number}} freq = -1 表示静音/不可靠
 */
export function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return { freq: -1, clarity: 0 };

  // 修剪首尾静音
  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  buf = buf.slice(r1, r2);
  const newSize = buf.length;

  // 自相关
  const c = new Array(newSize).fill(0);
  for (let i = 0; i < newSize; i++)
    for (let j = 0; j < newSize - i; j++)
      c[i] = c[i] + buf[j] * buf[j + i];

  // 找到第一个极小值之后的最大峰
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < newSize; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;

  // 抛物线插值，提高精度
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return {
    freq: sampleRate / T0,
    clarity: Math.min(1, maxval / (rms * rms * newSize)),
  };
}

/**
 * 麦克风 + pitch detection 管道封装
 *
 * 用法:
 *   const det = new PitchDetector({ onResult: r => ... });
 *   await det.start();
 *   det.stop();
 */
export class PitchDetector {
  constructor({ onResult, minFreq = 60, maxFreq = 2000, minClarity = 0.5 } = {}) {
    this.onResult = onResult ?? (() => {});
    this.minFreq = minFreq;
    this.maxFreq = maxFreq;
    this.minClarity = minClarity;
    this.audioCtx = null;
    this.analyser = null;
    this.buffer = null;
    this.stream = null;
    this.running = false;
  }

  async start() {
    if (this.running) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const src = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    src.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.audioCtx) this.audioCtx.close();
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
  }

  _loop() {
    if (!this.running) return;
    this.analyser.getFloatTimeDomainData(this.buffer);
    const { freq, clarity } = autoCorrelate(this.buffer, this.audioCtx.sampleRate);

    if (freq > this.minFreq && freq < this.maxFreq && clarity > this.minClarity) {
      const midi = freqToMidi(freq);
      const noteInfo = midiToNoteName(midi);
      const cents = centsOff(freq, noteInfo.midi);
      this.onResult({ detected: true, freq, clarity, midi: noteInfo.midi, noteInfo, cents });
    } else if (clarity < 0.3) {
      this.onResult({ detected: false, freq: 0, clarity, midi: null, noteInfo: null, cents: 0 });
    }

    requestAnimationFrame(() => this._loop());
  }
}
