/**
 * 和弦助手面板
 */

import * as Tone from 'tone';
import { getDiatonicChords, parseNoteInput, NOTE_NAMES } from '../core/music-theory.js';
import { suggestNextChord } from '../core/harmony.js';

export class ChordPanel {
  constructor(root) {
    this.root = root;
    this.$key    = root.querySelector('#key-select');
    this.$last   = root.querySelector('#last-chord-select');
    this.$melody = root.querySelector('#melody-input');
    this.$options = root.querySelector('#chord-options');
    this.$next   = root.querySelector('#chord-next');

    this.synth = null;

    ['input'].forEach(ev => {
      this.$key.addEventListener(ev, () => this._update());
      this.$last.addEventListener(ev, () => this._update());
      this.$melody.addEventListener(ev, () => this._update());
    });

    this._update();
  }

  _ensureSynth() {
    if (this.synth) return;
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
    }).toDestination();
    this.synth.volume.value = -8;
  }

  _playChord(chord) {
    this._ensureSynth();
    Tone.start();
    const notes = chord.notes.map(pc => NOTE_NAMES[pc] + 4);
    this.synth.triggerAttackRelease(notes, '1n');
  }

  _update() {
    const keyStr = this.$key.value;
    const diatonic = getDiatonicChords(keyStr);
    const noteClass = parseNoteInput(this.$melody.value, keyStr);

    // 同步 last-chord 下拉选项
    const prev = this.$last.value;
    this.$last.innerHTML = '<option value="">— 起始 —</option>' +
      diatonic.map(c => `<option value="${c.roman}">${c.roman} (${c.symbol})</option>`).join('');
    if (diatonic.some(c => c.roman === prev)) this.$last.value = prev;

    // 可选和弦
    if (noteClass === null) {
      this.$options.innerHTML = '<div class="muted-hint">请输入一个有效的音符（1-7 或 C-B）</div>';
    } else {
      const matching = diatonic.filter(c => c.notes.includes(noteClass));
      this.$options.innerHTML = matching.length
        ? matching.map(c => this._chipHtml(c)).join('')
        : '<div class="muted-hint">该音不在调内</div>';
    }

    // 推荐下一步
    const nextRomans = suggestNextChord(keyStr, this.$last.value);
    const nextChords = nextRomans.map(r => diatonic.find(c => c.roman === r)).filter(Boolean);
    this.$next.innerHTML = nextChords.length
      ? nextChords.map((c, i) => this._chipHtml(c, i === 0)).join('')
      : '<div class="muted-hint">…</div>';

    // 绑定点击
    this.root.querySelectorAll('.chord-chip').forEach(el => {
      el.addEventListener('click', () => {
        const chord = JSON.parse(el.dataset.chord);
        this._playChord(chord);
      });
    });
  }

  _chipHtml(chord, suggested = false) {
    return `<div class="chord-chip${suggested ? ' suggested' : ''}" data-chord='${JSON.stringify(chord)}'>
      ${chord.symbol}
      <span class="chord-roman">${chord.roman}</span>
    </div>`;
  }
}
