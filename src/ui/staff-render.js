/**
 * 五线谱渲染器 (VexFlow 适配层)
 * ---------------------------
 * 把音符数组通过 VexFlow 4.x 渲染到 DOM 容器。
 */

import { Renderer, Stave, StaveNote, Accidental, Formatter, Dot } from 'vexflow';
import { NOTE_NAMES_FLAT } from '../core/music-theory.js';
import { durationToNotation } from '../core/notation.js';

/** 时值 base → VexFlow duration 字符 */
function durToVex(base) {
  if (base >= 4)    return 'w';
  if (base >= 2)    return 'h';
  if (base >= 1)    return 'q';
  if (base >= 0.5)  return '8';
  if (base >= 0.25) return '16';
  return '32';
}

/**
 * @param {HTMLElement} container
 * @param {Array} notes
 */
export function renderStaff(container, notes) {
  container.innerHTML = '<div class="vf-container" id="vf-container"></div>';
  const vfHost = container.querySelector('#vf-container');

  try {
    const width = Math.max(600, vfHost.clientWidth - 40);
    const renderer = new Renderer(vfHost, Renderer.Backends.SVG);
    renderer.resize(width, 260);
    const ctx = renderer.getContext();
    ctx.setFont('Arial', 10);

    // 分小节（每小节 4 拍）
    const measures = [];
    let cur = [], beats = 0;
    for (const n of notes) {
      const dur = durationToNotation(n.beats);
      cur.push({ n, dur });
      beats += n.beats;
      if (beats >= 4 - 0.01) { measures.push(cur); cur = []; beats = 0; }
    }
    if (cur.length) measures.push(cur);

    const maxPerRow = Math.max(1, Math.floor((width - 20) / 200));
    const measuresToDraw = measures.slice(0, 8);
    const staveWidth = Math.floor((width - 20) / Math.min(measuresToDraw.length, maxPerRow));

    let x = 10, y = 40;
    measuresToDraw.forEach((measure, i) => {
      const stave = new Stave(x, y, staveWidth);
      if (i === 0) stave.addClef('treble').addTimeSignature('4/4');
      stave.setContext(ctx).draw();

      const vfNotes = measure.map(({ n, dur }) => {
        if (n.rest) {
          return new StaveNote({ keys: ['b/4'], duration: durToVex(dur.base) + 'r' });
        }
        const pc = n.midi % 12;
        const octave = Math.floor(n.midi / 12) - 1;
        const key = NOTE_NAMES_FLAT[pc].charAt(0).toLowerCase() + '/' + octave;
        const note = new StaveNote({ keys: [key], duration: durToVex(dur.base) });
        if (NOTE_NAMES_FLAT[pc].length > 1) {
          note.addModifier(new Accidental('b'), 0);
        }
        if (dur.dots) Dot.buildAndAttach([note], { all: true });
        return note;
      });

      try {
        Formatter.FormatAndDraw(ctx, stave, vfNotes);
      } catch (e) {
        console.warn('VexFlow format:', e);
      }

      x += staveWidth;
      if ((i + 1) % maxPerRow === 0) { x = 10; y += 120; }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="notation-empty">五线谱渲染失败：${err.message}</div>`;
  }
}
