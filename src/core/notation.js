/**
 * 时值与乐谱数据模型
 * ---------------------------
 * 把原始拍数转换为乐谱表示，并把 MIDI 解析结果降维成单声部旋律。
 */

import { midiToJianpu } from './music-theory.js';

/**
 * 把拍数转为时值记号
 * @param {number} beats - 以四分音符为 1 拍
 * @returns {{base: number, dots: number, isWhole?: boolean}}
 */
export function durationToNotation(beats) {
  if (beats >= 3.5) return { base: 4, dots: 0, isWhole: true };
  if (beats >= 3)   return { base: 2, dots: 1 };   // 附点二分
  if (beats >= 2)   return { base: 2, dots: 0 };   // 二分
  if (beats >= 1.5) return { base: 1, dots: 1 };   // 附点四分
  if (beats >= 1)   return { base: 1, dots: 0 };   // 四分
  if (beats >= 0.75) return { base: 0.5, dots: 1 };
  if (beats >= 0.5)  return { base: 0.5, dots: 0 };
  if (beats >= 0.25) return { base: 0.25, dots: 0 };
  return { base: 0.125, dots: 0 };
}

/**
 * 把解析后的 MIDI 转为单声部旋律音符列表
 * 简化策略：优先选 channel 0，同 tick 取最高音
 *
 * @param {object} parsedMidi - { notes, ticksPerQuarter, tempo }
 * @param {number} keyRootPc - 调的主音 pitch class，用于简谱映射
 * @returns {{notes: Array, tempo: number}}
 */
export function midiToMelody(parsedMidi, keyRootPc = 0) {
  const { notes, ticksPerQuarter, tempo } = parsedMidi;
  if (!notes.length) return { notes: [], tempo: 120 };

  const bpm = Math.round(60000000 / tempo);

  // 优先取 channel 0；否则用全部
  const chan0 = notes.filter(n => n.ch === 0);
  const src = chan0.length ? chan0 : notes;

  // 合并同 tick 发声的音，保留最高音（旋律近似）
  const grouped = {};
  src.forEach(n => {
    if (!grouped[n.tick] || grouped[n.tick].midi < n.midi) grouped[n.tick] = n;
  });
  const sorted = Object.values(grouped).sort((a, b) => a.tick - b.tick);

  const melody = sorted.map((n, i) => {
    const next = sorted[i + 1];
    const actualDur = next ? Math.min(n.duration, next.tick - n.tick) : n.duration;
    const beats = Math.max(0.125, actualDur / ticksPerQuarter);
    return {
      midi: n.midi,
      beats,
      startBeat: n.tick / ticksPerQuarter,
      jianpu: midiToJianpu(n.midi, keyRootPc),
    };
  });

  return { notes: melody, tempo: bpm };
}

/**
 * 解析用户输入的简谱字符串为音符序列
 *
 * 语法:
 *   1-7          简谱数字（C 大调下相当于 C D E F G A B）
 *   #1 / b3      升/降半音
 *   1' / 1,      高八度 / 低八度（可重复 1'' / 1,,）
 *   -            延长上一个音 1 拍
 *   0            休止符
 *   |            小节线（忽略）
 *
 * @param {string} input
 * @returns {Array}
 */
export function parseJianpuInput(input) {
  const tokens = input.trim().split(/\s+/);
  const notes = [];
  let last = null;
  const scaleSteps = [0, 2, 4, 5, 7, 9, 11];

  for (const tok of tokens) {
    if (tok === '|') continue;
    if (tok === '-' && last) {
      last.beats += 1;
      continue;
    }
    if (tok === '0') {
      const rest = { rest: true, beats: 1 };
      notes.push(rest); last = rest;
      continue;
    }
    const m = tok.match(/^([#b]?)([1-7])([,']*)$/);
    if (m) {
      const [, acc, num, oct] = m;
      let midi = 60 + scaleSteps[parseInt(num) - 1];
      if (acc === '#') midi += 1;
      if (acc === 'b') midi -= 1;
      for (const c of oct) {
        if (c === "'") midi += 12;
        if (c === ',') midi -= 12;
      }
      const n = { midi, beats: 1, jianpu: midiToJianpu(midi, 0) };
      notes.push(n); last = n;
    }
  }
  return notes;
}
