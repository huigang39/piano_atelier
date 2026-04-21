/**
 * 简谱渲染器
 * ---------------------------
 * 输入: 音符数组 + 调名 + 速度
 * 输出: 拼装好的 HTML 字符串（由调用方插入到 DOM）
 */

import { NOTE_NAMES } from '../core/music-theory.js';
import { durationToNotation } from '../core/notation.js';

const BEATS_PER_BAR = 4;

export function renderJianpu(notes, keyRootPc = 0, tempo = 120) {
  const keyName = NOTE_NAMES[keyRootPc];
  let html = `<div class="numbered-notation">
    <div class="title">乐谱 Score</div>
    <div class="key-sig">1 = ${keyName}    ♩ = ${tempo}</div>
    <div class="score-content">`;

  let beatsInBar = 0;

  notes.forEach((n, idx) => {
    if (n.rest) {
      html += `<span class="jp-note" data-idx="${idx}">0</span>`;
    } else {
      const jp = n.jianpu;
      const dur = durationToNotation(n.beats);

      let cell = `<span class="jp-note" data-idx="${idx}">`;
      if (jp.sharp) cell += '<sup style="font-size:14px">♯</sup>';
      cell += jp.num;
      if (jp.octaveOffset > 0) {
        cell += `<span class="oct-dot-high">${'·'.repeat(jp.octaveOffset)}</span>`;
      } else if (jp.octaveOffset < 0) {
        cell += `<span class="oct-dot-low">${'·'.repeat(-jp.octaveOffset)}</span>`;
      }
      cell += '</span>';
      html += cell;

      // 延长线（二分、全音符）
      if (dur.base >= 2) {
        html += '<span class="jp-note">—</span>';
        if (dur.base >= 4) html += '<span class="jp-note">—</span><span class="jp-note">—</span>';
      }
      if (dur.dots) html += '<span class="jp-note">·</span>';
    }

    beatsInBar += n.beats;
    if (beatsInBar >= BEATS_PER_BAR - 0.01) {
      html += '<span class="jp-bar">|</span> ';
      beatsInBar = 0;
    }
  });

  html += '</div></div>';
  return html;
}
