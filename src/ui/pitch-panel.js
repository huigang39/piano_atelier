/**
 * 音高辨识面板
 * ---------------------------
 * 编排 PitchDetector + PianoKeyboard + 各 DOM 元素的显示。
 */

import * as Tone from 'tone';
import { PitchDetector } from '../core/pitch-detect.js';
import { midiToFreq } from '../core/music-theory.js';
import { PianoKeyboard } from './piano-keyboard.js';

export class PitchPanel {
  constructor(root) {
    this.root = root;
    this.history = [];
    this.recording = [];
    this.recordStart = 0;
    this.lastMidi = null;
    this.synth = null;
    this.playTimeouts = [];
    this.isPlaying = false;

    this.$note     = root.querySelector('#pitch-note');
    this.$freq     = root.querySelector('#pitch-freq');
    this.$cents    = root.querySelector('#pitch-cents');
    this.$clarity  = root.querySelector('#pitch-clarity');
    this.$meter    = root.querySelector('#meter-fill');
    this.$history  = root.querySelector('#history-list');
    this.$status   = root.querySelector('#status-pitch');
    this.$btnMic   = root.querySelector('#btn-mic');
    this.$btnClear = root.querySelector('#btn-clear-history');
    this.$btnReplay = root.querySelector('#btn-replay');

    const pianoEl = root.querySelector('#piano-pitch');
    const wrap = root.querySelector('.keyboard-wrap');
    this.piano = new PianoKeyboard(pianoEl, { scrollWrap: wrap });

    this.detector = new PitchDetector({
      onResult: r => this._onDetection(r),
    });

    this.$btnMic.addEventListener('click', () => this._toggleMic());
    this.$btnClear.addEventListener('click', () => this._clearHistory());
    if (this.$btnReplay) {
      this.$btnReplay.addEventListener('click', () => this._replay());
      this._updateReplayBtn();
    }
  }

  async _toggleMic() {
    if (this.detector.running) {
      this.detector.stop();
      this._closeOpenNote();
      this._setMicState(false);
      this._resetDisplay();
      this._updateReplayBtn();
    } else {
      try {
        this._stopReplay();
        await this.detector.start();
        this._setMicState(true);
      } catch (err) {
        alert('无法访问麦克风：' + err.message);
      }
    }
  }

  _setMicState(on) {
    if (on) {
      this.$btnMic.textContent = '■ 停止';
      this.$btnMic.classList.add('danger');
      this.$btnMic.classList.remove('primary');
      this.$status.innerHTML = '<span class="sb-ok">● 正在聆听</span>';
    } else {
      this.$btnMic.textContent = '▶ 启动麦克风';
      this.$btnMic.classList.add('primary');
      this.$btnMic.classList.remove('danger');
      this.$status.innerHTML = '● 已停止';
    }
  }

  _onDetection({ detected, freq, clarity, midi, noteInfo, cents }) {
    if (detected) {
      this.$note.classList.remove('silent');
      this.$note.innerHTML = `${noteInfo.name}<span class="octave">${noteInfo.octave}</span>`;
      this.$freq.textContent = freq.toFixed(1) + ' Hz';
      this.$cents.textContent = (cents >= 0 ? '+' : '') + cents + '¢';
      this.$clarity.textContent = (clarity * 100).toFixed(0) + '%';

      const pct = Math.max(-50, Math.min(50, cents));
      if (pct >= 0) {
        this.$meter.style.left = '50%';
        this.$meter.style.width = (pct / 50 * 50) + '%';
      } else {
        this.$meter.style.left = (50 + pct / 50 * 50) + '%';
        this.$meter.style.width = (-pct / 50 * 50) + '%';
      }

      this.piano.highlight(midi);

      if (this.lastMidi !== midi) {
        this._closeOpenNote();
        this._startNote(midi, noteInfo, freq);
        this._addHistory(noteInfo, freq);
        this.lastMidi = midi;
        this._updateReplayBtn();
      }
    } else {
      this.$note.classList.add('silent');
      this.$note.textContent = '— —';
      if (this.lastMidi !== null) {
        this._closeOpenNote();
        this._updateReplayBtn();
      }
      this.lastMidi = null;
    }
  }

  _startNote(midi, noteInfo, freq) {
    const now = performance.now();
    if (this.recording.length === 0) this.recordStart = now;
    this.recording.push({
      midi,
      noteInfo,
      freq,
      startMs: now - this.recordStart,
      durationMs: null,
    });
  }

  _closeOpenNote() {
    if (!this.recording.length) return;
    const last = this.recording[this.recording.length - 1];
    if (last.durationMs === null) {
      last.durationMs = performance.now() - this.recordStart - last.startMs;
    }
  }

  _addHistory(noteInfo, freq) {
    this.history.unshift({ note: noteInfo, freq, time: new Date() });
    if (this.history.length > 20) this.history.pop();
    this.$history.innerHTML = this.history.map(h =>
      `<div class="history-item">
        <span class="note">${h.note.name}${h.note.octave}</span>
        <span>${h.freq.toFixed(1)}Hz</span>
        <span>${h.time.toLocaleTimeString()}</span>
      </div>`
    ).join('');
  }

  _clearHistory() {
    this._stopReplay();
    this.history = [];
    this.recording = [];
    this.lastMidi = null;
    this.$history.innerHTML = '<div class="muted-hint">记录已清空</div>';
    this._updateReplayBtn();
  }

  _updateReplayBtn() {
    if (!this.$btnReplay) return;
    const hasNotes = this.recording.some(n => n.durationMs !== null);
    this.$btnReplay.disabled = !hasNotes || this.detector.running;
  }

  async _replay() {
    if (this.isPlaying || this.detector.running) return;
    this._closeOpenNote();
    const notes = this.recording.filter(n => n.durationMs !== null && n.durationMs > 30);
    if (!notes.length) return;

    await Tone.start();
    if (!this.synth) {
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4 },
      }).toDestination();
      this.synth.volume.value = -10;
    }

    this.isPlaying = true;
    this.$status.innerHTML = '<span class="sb-ok">● 回放中…</span>';
    const t0 = Tone.now() + 0.1;
    const baseMs = notes[0].startMs;
    let endMs = 0;

    notes.forEach(n => {
      const freq = midiToFreq(n.midi);
      const startSec = (n.startMs - baseMs) / 1000;
      const durSec = Math.max(0.08, (n.durationMs / 1000) * 0.95);
      this.synth.triggerAttackRelease(freq, durSec, t0 + startSec);

      const hlTimer = setTimeout(() => this.piano.highlight(n.midi), startSec * 1000);
      this.playTimeouts.push(hlTimer);
      endMs = Math.max(endMs, (n.startMs - baseMs) + n.durationMs);
    });

    const endTimer = setTimeout(() => {
      this.isPlaying = false;
      this.piano.clearHighlight();
      this.$status.innerHTML = '● 已停止';
      this._updateReplayBtn();
    }, endMs + 300);
    this.playTimeouts.push(endTimer);
  }

  _stopReplay() {
    if (this.synth) this.synth.releaseAll();
    this.playTimeouts.forEach(clearTimeout);
    this.playTimeouts = [];
    this.isPlaying = false;
    this.piano.clearHighlight();
  }

  _resetDisplay() {
    this.$note.textContent = '— —';
    this.$note.classList.add('silent');
    this.$freq.textContent = '—';
    this.$cents.textContent = '—';
    this.$clarity.textContent = '—';
    this.$meter.style.width = '0';
    this.piano.clearHighlight();
  }
}
