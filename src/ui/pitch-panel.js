/**
 * 音高辨识面板
 * ---------------------------
 * 编排 PitchDetector + PianoKeyboard + 各 DOM 元素的显示。
 */

import { PitchDetector } from '../core/pitch-detect.js';
import { PianoKeyboard } from './piano-keyboard.js';

export class PitchPanel {
  constructor(root) {
    this.root = root;
    this.history = [];
    this.lastMidi = null;

    this.$note     = root.querySelector('#pitch-note');
    this.$freq     = root.querySelector('#pitch-freq');
    this.$cents    = root.querySelector('#pitch-cents');
    this.$clarity  = root.querySelector('#pitch-clarity');
    this.$meter    = root.querySelector('#meter-fill');
    this.$history  = root.querySelector('#history-list');
    this.$status   = root.querySelector('#status-pitch');
    this.$btnMic   = root.querySelector('#btn-mic');
    this.$btnClear = root.querySelector('#btn-clear-history');

    const pianoEl = root.querySelector('#piano-pitch');
    const wrap = root.querySelector('.keyboard-wrap');
    this.piano = new PianoKeyboard(pianoEl, { scrollWrap: wrap });

    this.detector = new PitchDetector({
      onResult: r => this._onDetection(r),
    });

    this.$btnMic.addEventListener('click', () => this._toggleMic());
    this.$btnClear.addEventListener('click', () => this._clearHistory());
  }

  async _toggleMic() {
    if (this.detector.running) {
      this.detector.stop();
      this._setMicState(false);
      this._resetDisplay();
    } else {
      try {
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
        this._addHistory(noteInfo, freq);
        this.lastMidi = midi;
      }
    } else {
      this.$note.classList.add('silent');
      this.$note.textContent = '— —';
      this.lastMidi = null;
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
    this.history = [];
    this.$history.innerHTML = '<div class="muted-hint">记录已清空</div>';
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
