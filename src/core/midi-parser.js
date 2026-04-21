/**
 * MIDI 文件解析器
 * ---------------------------
 * 标准 MIDI File (SMF) 格式 1 解析器。
 * 只提取音符 on/off 事件与 tempo。
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{notes: Array, ticksPerQuarter: number, tempo: number}}
 *   notes: [{ midi, tick, duration, vel, ch }]
 *   tempo: 微秒/四分音符
 */
export function parseMidi(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let offset = 0;

  const readUint32 = () => { const v = view.getUint32(offset); offset += 4; return v; };
  const readUint16 = () => { const v = view.getUint16(offset); offset += 2; return v; };
  const readUint8 = () => view.getUint8(offset++);
  const readString = (n) => {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(readUint8());
    return s;
  };
  const readVarLen = () => {
    let v = 0, b;
    do { b = readUint8(); v = (v << 7) | (b & 0x7f); } while (b & 0x80);
    return v;
  };

  // --- Header chunk ---
  if (readString(4) !== 'MThd') throw new Error('不是有效的 MIDI 文件');
  readUint32();   // header length
  readUint16();   // format
  const ntrks = readUint16();
  const ticksPerQuarter = readUint16();

  const notes = [];
  let tempo = 500000;  // 默认 500000 μs/beat = 120 BPM

  // --- Track chunks ---
  for (let t = 0; t < ntrks; t++) {
    if (readString(4) !== 'MTrk') break;
    const trackLen = readUint32();
    const trackEnd = offset + trackLen;
    let absTick = 0;
    let runningStatus = 0;
    const activeNotes = {};  // key: `${ch}-${note}` -> {tick, vel}

    while (offset < trackEnd) {
      const delta = readVarLen();
      absTick += delta;
      let status = view.getUint8(offset);
      if (status < 0x80) {
        status = runningStatus;  // running status
      } else {
        offset++;
        runningStatus = status;
      }
      const type = status & 0xf0;
      const ch = status & 0x0f;

      if (status === 0xff) {
        // Meta event
        const metaType = readUint8();
        const len = readVarLen();
        if (metaType === 0x51 && len === 3) {
          // Set tempo
          tempo = (readUint8() << 16) | (readUint8() << 8) | readUint8();
        } else {
          offset += len;
        }
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx
        const len = readVarLen();
        offset += len;
      } else if (type === 0x90) {
        // Note On
        const note = readUint8();
        const vel = readUint8();
        if (vel > 0) {
          activeNotes[`${ch}-${note}`] = { tick: absTick, vel };
        } else {
          // vel 0 = Note Off
          const start = activeNotes[`${ch}-${note}`];
          if (start) {
            notes.push({ midi: note, tick: start.tick, duration: absTick - start.tick, vel: start.vel, ch });
            delete activeNotes[`${ch}-${note}`];
          }
        }
      } else if (type === 0x80) {
        // Note Off
        const note = readUint8();
        readUint8();  // vel
        const start = activeNotes[`${ch}-${note}`];
        if (start) {
          notes.push({ midi: note, tick: start.tick, duration: absTick - start.tick, vel: start.vel, ch });
          delete activeNotes[`${ch}-${note}`];
        }
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
        offset += 2;  // 2-byte events (aftertouch, CC, pitch bend)
      } else if (type === 0xc0 || type === 0xd0) {
        offset += 1;  // 1-byte events (program, channel pressure)
      } else {
        offset++;
      }
    }
    offset = trackEnd;
  }

  notes.sort((a, b) => a.tick - b.tick);
  return { notes, ticksPerQuarter, tempo };
}
