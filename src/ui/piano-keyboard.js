/**
 * 可复用的钢琴键盘组件
 * ---------------------------
 * 在给定容器中渲染一段钢琴键盘，支持高亮某个 MIDI 音符。
 */

export class PianoKeyboard {
  /**
   * @param {HTMLElement} container - 外层 DOM，本组件会清空并接管其内容
   * @param {object} [opts]
   * @param {number} [opts.startMidi=36] - 起始音 (C2 = 36)
   * @param {number} [opts.endMidi=84]   - 结束音 (C6 = 84)
   * @param {HTMLElement} [opts.scrollWrap] - 可滚动的外层容器（用于自动居中），默认为 container.parentElement
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.startMidi = opts.startMidi ?? 36;
    this.endMidi = opts.endMidi ?? 84;
    this.scrollWrap = opts.scrollWrap ?? container.parentElement;
    this.whiteKeyWidth = 32;
    this.whiteKeyGap = 1;
    this._render();
  }

  _render() {
    const { container, startMidi, endMidi, whiteKeyWidth, whiteKeyGap } = this;
    container.innerHTML = '';

    const whitePCs = [0, 2, 4, 5, 7, 9, 11];
    const blackPCs = { 1: true, 3: true, 6: true, 8: true, 10: true };

    // --- 白键 ---
    const whiteKeyByMidi = new Map();
    let whiteIdx = 0;
    for (let m = startMidi; m <= endMidi; m++) {
      const pc = m % 12;
      if (!whitePCs.includes(pc)) continue;

      const wk = document.createElement('div');
      wk.className = 'white-key';
      wk.dataset.midi = m;
      if (pc === 0) {
        const lbl = document.createElement('div');
        lbl.className = 'key-label';
        lbl.textContent = 'C' + (Math.floor(m / 12) - 1);
        wk.appendChild(lbl);
      }
      container.appendChild(wk);
      whiteKeyByMidi.set(m, whiteIdx);
      whiteIdx++;
    }

    // --- 黑键 (绝对定位，挂在左邻白键的右肩) ---
    for (let m = startMidi; m <= endMidi; m++) {
      if (!blackPCs[m % 12]) continue;
      const leftWhiteIdx = whiteKeyByMidi.get(m - 1);
      if (leftWhiteIdx === undefined) continue;
      const bk = document.createElement('div');
      bk.className = 'black-key';
      bk.dataset.midi = m;
      // 容器 padding-left 8px；每个白键占 width+gap；黑键(20px)居中骑于白键右缘
      bk.style.left = (8 + (leftWhiteIdx + 1) * (whiteKeyWidth + whiteKeyGap) - 10 - whiteKeyGap / 2) + 'px';
      container.appendChild(bk);
    }
  }

  /** 高亮某个 MIDI 音符对应的琴键，并自动滚动到可视区 */
  highlight(midi) {
    this.clearHighlight();
    const key = this.container.querySelector(`[data-midi="${midi}"]`);
    if (!key) return;
    key.classList.add('detected');

    // 自动滚动
    const wrap = this.scrollWrap;
    if (!wrap) return;
    const keyRect = key.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    if (keyRect.left < wrapRect.left || keyRect.right > wrapRect.right) {
      const offset = key.offsetLeft - wrap.clientWidth / 2 + key.offsetWidth / 2;
      wrap.scrollTo({ left: offset, behavior: 'smooth' });
    }
  }

  clearHighlight() {
    this.container.querySelectorAll('.detected').forEach(k => k.classList.remove('detected'));
  }
}
