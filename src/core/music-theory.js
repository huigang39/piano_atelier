/**
 * 音乐理论基础工具
 * ---------------------------
 * 纯函数、无副作用、无 DOM 依赖，可被任何层调用。
 *
 * 主要概念约定：
 *   - midi: 整数 0-127，A4 = 69
 *   - freq: 赫兹 (Hz)
 *   - pc (pitch class): 0-11，C=0, B=11
 *   - note name: 'C', 'C#', 'D', ...
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const ROOT_MAP = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

/* ---------- 频率 ↔ MIDI ---------- */

export function freqToMidi(freq) {
  return 12 * Math.log2(freq / 440) + 69;
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi) {
  const n = Math.round(midi);
  return {
    name: NOTE_NAMES[n % 12],
    octave: Math.floor(n / 12) - 1,
    midi: n,
  };
}

/** 相对标准音的音分偏差 (±50 以内视为准确) */
export function centsOff(freq, midi) {
  return Math.round(1200 * Math.log2(freq / midiToFreq(midi)));
}

/* ---------- 调式 & 和弦 ---------- */

const MAJOR_DIATONIC = [
  { roman: 'I',    type: 'maj', degree: 0 },
  { roman: 'ii',   type: 'min', degree: 2 },
  { roman: 'iii',  type: 'min', degree: 4 },
  { roman: 'IV',   type: 'maj', degree: 5 },
  { roman: 'V',    type: 'maj', degree: 7 },
  { roman: 'vi',   type: 'min', degree: 9 },
  { roman: 'vii°', type: 'dim', degree: 11 },
];

const MINOR_DIATONIC = [
  { roman: 'i',    type: 'min', degree: 0 },
  { roman: 'ii°', type: 'dim', degree: 2 },
  { roman: 'III',  type: 'maj', degree: 3 },
  { roman: 'iv',   type: 'min', degree: 5 },
  { roman: 'v',    type: 'min', degree: 7 },
  { roman: 'VI',   type: 'maj', degree: 8 },
  { roman: 'VII',  type: 'maj', degree: 10 },
];

const CHORD_INTERVALS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
};

export function parseKey(keyStr) {
  const isMinor = keyStr.endsWith('m');
  const root = isMinor ? keyStr.slice(0, -1) : keyStr;
  return { root, isMinor, rootMidi: ROOT_MAP[root] };
}

export function buildChord(rootName, type) {
  const rootPc = ROOT_MAP[rootName];
  return CHORD_INTERVALS[type].map(i => (rootPc + i) % 12);
}

/** 返回给定调的 7 个自然音和弦 */
export function getDiatonicChords(keyStr) {
  const { rootMidi, isMinor } = parseKey(keyStr);
  const template = isMinor ? MINOR_DIATONIC : MAJOR_DIATONIC;
  return template.map(t => {
    const chordRootPc = (rootMidi + t.degree) % 12;
    const chordRoot = NOTE_NAMES[chordRootPc];
    const notes = buildChord(chordRoot, t.type);
    let symbol = chordRoot;
    if (t.type === 'min') symbol += 'm';
    if (t.type === 'dim') symbol += '°';
    return { roman: t.roman, symbol, notes, root: chordRoot, type: t.type };
  });
}

/** 把"1-7"简谱数字或"C-B"音名解析为 pitch class (0-11) */
export function parseNoteInput(input, keyStr) {
  input = input.trim();
  if (!input) return null;

  // 简谱数字（相对调）
  if (/^[1-7]$/.test(input)) {
    const { rootMidi, isMinor } = parseKey(keyStr);
    const steps = isMinor
      ? [0, 2, 3, 5, 7, 8, 10]  // 自然小调
      : [0, 2, 4, 5, 7, 9, 11]; // 大调
    return (rootMidi + steps[parseInt(input) - 1]) % 12;
  }

  // 音名（绝对）
  const normalized = input.charAt(0).toUpperCase() + input.slice(1);
  if (ROOT_MAP[normalized] !== undefined) return ROOT_MAP[normalized];
  return null;
}

/** MIDI pitch → 简谱信息 {num, sharp, octaveOffset} */
export function midiToJianpu(midi, keyRootPc = 0) {
  const pc = ((midi - keyRootPc) % 12 + 12) % 12;
  const map = [
    { n: '1', sharp: false }, { n: '1', sharp: true },
    { n: '2', sharp: false }, { n: '2', sharp: true },
    { n: '3', sharp: false }, { n: '4', sharp: false },
    { n: '4', sharp: true }, { n: '5', sharp: false },
    { n: '5', sharp: true }, { n: '6', sharp: false },
    { n: '6', sharp: true }, { n: '7', sharp: false },
  ];
  const info = map[pc];
  // 八度：以 C4 (MIDI 60) 为中音区
  const octaveOffset = Math.floor((midi - 60 - (pc - keyRootPc)) / 12);
  return { num: info.n, sharp: info.sharp, octaveOffset };
}
