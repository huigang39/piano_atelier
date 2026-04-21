/**
 * 和声进行规则
 * ---------------------------
 * 基于常用的调式内和声进行推荐下一个和弦。
 * 规则来源于古典和流行音乐的常见终止式与连接方式。
 */

import { parseKey } from './music-theory.js';

const MAJOR_RULES = {
  'I':    ['V', 'vi', 'IV', 'ii'],
  'ii':   ['V', 'vii°'],
  'iii':  ['vi', 'IV'],
  'IV':   ['V', 'I', 'ii'],
  'V':    ['I', 'vi'],
  'vi':   ['IV', 'ii', 'V'],
  'vii°': ['I'],
};

const MINOR_RULES = {
  'i':    ['iv', 'VI', 'v', 'VII'],
  'ii°': ['v', 'i'],
  'III':  ['VI', 'iv'],
  'iv':   ['v', 'i', 'VII'],
  'v':    ['i', 'VI'],
  'VI':   ['iv', 'ii°', 'VII'],
  'VII':  ['III', 'i'],
};

/**
 * 根据当前调和上一个和弦，推荐下一步可选的和弦（罗马数字记号）
 * @param {string} keyStr - e.g. 'C', 'Am'
 * @param {string} lastRoman - 上一个和弦的罗马数字；空串/undefined 表示起始
 * @returns {string[]}
 */
export function suggestNextChord(keyStr, lastRoman) {
  const { isMinor } = parseKey(keyStr);
  const rules = isMinor ? MINOR_RULES : MAJOR_RULES;

  if (!lastRoman) {
    // 起始：推荐主和弦与常见起始选项
    return isMinor ? ['i', 'iv', 'VI'] : ['I', 'IV', 'vi'];
  }
  return rules[lastRoman] || [];
}
