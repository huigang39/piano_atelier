/**
 * 应用入口
 * ---------------------------
 * 初始化各功能面板，处理 Tab 切换。
 */

import './styles/theme.css';
import './styles/base.css';
import './styles/components.css';

import { PitchPanel } from './ui/pitch-panel.js';
import { ChordPanel } from './ui/chord-panel.js';
import { ScorePanel } from './ui/score-panel.js';

// ---- 实例化 3 个面板 ----
new PitchPanel(document.getElementById('panel-pitch'));
new ChordPanel(document.getElementById('panel-chord'));
new ScorePanel(document.getElementById('panel-score'));

// ---- Tab 切换 ----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});
