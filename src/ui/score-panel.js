/**
 * 乐谱转换面板
 */

import * as Tone from 'tone';
import { parseMidi } from '../core/midi-parser.js';
import { midiToMelody, parseJianpuInput } from '../core/notation.js';
import { midiToFreq, midiToJianpu } from '../core/music-theory.js';
import { renderJianpu } from './jianpu-render.js';
import { renderStaff } from './staff-render.js';

const EXAMPLE_ODE_TO_JOY = [
  64, 64, 65, 67, 67, 65, 64, 62,
  60, 60, 62, 64,
].map(midi => ({ midi, beats: 1 }))
 .concat([
   { midi: 64, beats: 1.5 },
   { midi: 62, beats: 0.5 },
   { midi: 62, beats: 2 },
 ]);

export class ScorePanel {
  constructor(root) {
    this.root = root;
    this.state = {
      notation: 'numbered',   // 'numbered' | 'staff'
      notes: [],
      keyRoot: 0,
      tempo: 120,
      isPlaying: false,
    };
    this.synth = null;
    this.playTimeouts = [];

    this.$display = root.querySelector('#notation-display');
    this.$status  = root.querySelector('#status-score');
    this.$file    = root.querySelector('#midi-file');

    root.querySelector('#btn-upload').addEventListener('click', () => this.$file.click());
    this.$file.addEventListener('change', e => this._onFile(e));
    root.querySelector('#btn-example').addEventListener('click', () => this._loadExample());
    root.querySelector('#btn-play').addEventListener('click', () => this._play());
    root.querySelector('#btn-stop').addEventListener('click', () => this._stop());
    root.querySelector('#manual-score').addEventListener('input', e => this._onManual(e.target.value));

    root.querySelectorAll('.notation-toggle button').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('.notation-toggle button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        this.state.notation = b.dataset.notation;
        this._render();
      });
    });
  }

  async _onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseMidi(buf);
      const { notes, tempo } = midiToMelody(parsed, this.state.keyRoot);
      if (!notes.length) {
        this.$status.innerHTML = '<span class="sb-warn">● MIDI 文件中未找到音符</span>';
        return;
      }
      this.state.notes = notes;
      this.state.tempo = tempo;
      this._render();
      this.$status.innerHTML = `<span class="sb-ok">● 已加载 ${notes.length} 个音符 · 速度 ♩=${tempo}</span>`;
    } catch (err) {
      alert('解析 MIDI 失败：' + err.message);
    }
  }

  _loadExample() {
    this.state.notes = EXAMPLE_ODE_TO_JOY.map(n => ({
      ...n,
      jianpu: midiToJianpu(n.midi, this.state.keyRoot),
    }));
    this.state.tempo = 120;
    this._render();
    this.$status.innerHTML = '<span class="sb-ok">● 示例：贝多芬《欢乐颂》</span>';
  }

  _onManual(text) {
    if (!text.trim()) return;
    const notes = parseJianpuInput(text);
    this.state.notes = notes;
    this.state.tempo = 100;
    this._render();
    this.$status.innerHTML = `<span class="sb-ok">● 手动输入 ${notes.length} 个音符</span>`;
  }

  _render() {
    const { notes, notation, keyRoot, tempo } = this.state;
    if (!notes.length) {
      this.$display.innerHTML = '<div class="notation-empty">导入 MIDI 或输入简谱后，乐谱将在这里显示</div>';
      return;
    }
    if (notation === 'numbered') {
      this.$display.innerHTML = renderJianpu(notes, keyRoot, tempo);
    } else {
      renderStaff(this.$display, notes);
    }
  }

  async _play() {
    if (!this.state.notes.length || this.state.isPlaying) return;
    await Tone.start();
    if (!this.synth) {
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
      }).toDestination();
      this.synth.volume.value = -10;
    }

    this.state.isPlaying = true;
    const beatSec = 60 / this.state.tempo;
    let t = Tone.now() + 0.1;

    this.state.notes.forEach((n, idx) => {
      if (!n.rest) {
        const freq = midiToFreq(n.midi);
        this.synth.triggerAttackRelease(freq, n.beats * beatSec * 0.95, t);
      }
      const timer = setTimeout(() => {
        this.$display.querySelectorAll('.jp-note.active-playback').forEach(e => e.classList.remove('active-playback'));
        const el = this.$display.querySelector(`.jp-note[data-idx="${idx}"]`);
        if (el) el.classList.add('active-playback');
      }, (t - Tone.now()) * 1000);
      this.playTimeouts.push(timer);
      t += n.beats * beatSec;
    });

    const totalMs = (t - Tone.now()) * 1000 + 200;
    const endTimer = setTimeout(() => {
      this.state.isPlaying = false;
      this.$display.querySelectorAll('.jp-note.active-playback').forEach(e => e.classList.remove('active-playback'));
    }, totalMs);
    this.playTimeouts.push(endTimer);
  }

  _stop() {
    if (this.synth) this.synth.releaseAll();
    this.playTimeouts.forEach(clearTimeout);
    this.playTimeouts = [];
    this.state.isPlaying = false;
    this.$display.querySelectorAll('.jp-note.active-playback').forEach(e => e.classList.remove('active-playback'));
  }
}
