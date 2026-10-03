// 共通処理：API呼び出し、DOM生成、カレンダー、イベント入力フォーム、回答／集計グリッド
'use strict';

const SYMBOLS = { ok: '⭕️', online: '💻', maybe: '△' };
const LABELS = { ok: '対面OK', online: 'オンラインのみ', maybe: '微妙' };
const CYCLE = ['', 'ok', 'online', 'maybe'];
const LIMITS = { title: 50, memo: 200, name: 20, dates: 31, slots: 500 };
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// ---- DOM ----
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

function toast(msg) {
  const t = h('div', { class: 'toast', text: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 2200);
}

function legend() {
  return h('div', { class: 'legend' },
    Object.keys(SYMBOLS).map(k => h('span', { class: 'v-' + k, text: `${SYMBOLS[k]}${LABELS[k]}` })),
    h('span', { text: '空欄＝不可' }));
}

// ---- API ----
async function api(path, { method = 'GET', query, body } = {}) {
  let url = 'api/' + path;
  if (query) url += '?' + new URLSearchParams(query).toString();
  const init = { method };
  if (body !== undefined) {
    init.method = 'POST';
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new Error('通信に失敗しました。電波の良いところで再度お試しください');
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* ignore */ }
  if (!res.ok) throw new Error(data.error || `エラーが発生しました (${res.status})`);
  return data;
}

// ---- localStorage（使えない環境でも動くように） ----
function loadStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; }
}
function saveStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

// ---- 日付・時刻 ----
const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function fmtDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}
function fmtDateLong(s) {
  const [y, m, d] = s.split('-').map(Number);
  return `${y}/${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}
const toMin = t => { const [h2, m] = t.split(':').map(Number); return h2 * 60 + m; };
const fromMin = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

function slotTimes(start, end, step) {
  const out = [];
  for (let t = toMin(start); t < toMin(end); t += step) out.push(fromMin(t));
  return out;
}
const slotKey = (date, time) => `${date}_${time}`;
function allKeys(ev) {
  const keys = [];
  for (const t of slotTimes(ev.start_time, ev.end_time, ev.slot_minutes)) {
    for (const d of ev.dates) keys.push(slotKey(d, t));
  }
  return keys;
}

function pageUrl(file, query) {
  const u = new URL(file, location.href);
  u.search = new URLSearchParams(query).toString();
  u.hash = '';
  return u.toString();
}

// ---- コピー用入力欄 ----
function copyRow(value) {
  const input = h('input', { type: 'text', readonly: true, value });
  input.addEventListener('focus', () => input.select());
  const btn = h('button', {
    type: 'button',
    onclick: async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(value); ok = true; } catch (e) { /* fallback */ }
      if (!ok) {
        input.select();
        try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      }
      toast(ok ? 'コピーしました' : '長押ししてコピーしてください');
    },
  }, 'コピー');
  return h('div', { class: 'copy-row' }, input, btn);
}

// ---- カレンダー（複数日選択） ----
function calendarPicker(selected, onChange) {
  const today = new Date();
  const first = [...selected].sort()[0];
  let [vy, vm] = first ? first.split('-').map(Number) : [today.getFullYear(), today.getMonth() + 1];
  const todayStr = ymd(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const root = h('div', { class: 'cal' });
  const countEl = h('div', { class: 'cal-count' });

  function draw() {
    root.replaceChildren();
    root.append(h('div', { class: 'cal-head' },
      h('button', { type: 'button', onclick: () => { vm--; if (vm < 1) { vm = 12; vy--; } draw(); } }, '‹'),
      h('span', { text: `${vy}年${vm}月` }),
      h('button', { type: 'button', onclick: () => { vm++; if (vm > 12) { vm = 1; vy++; } draw(); } }, '›')));
    const grid = h('div', { class: 'cal-grid' }, WEEKDAYS.map(w => h('div', { class: 'cal-dow', text: w })));
    const lead = new Date(vy, vm - 1, 1).getDay();
    const days = new Date(vy, vm, 0).getDate();
    for (let i = 0; i < lead; i++) grid.append(h('button', { type: 'button', class: 'cal-day empty', disabled: true }));
    for (let d = 1; d <= days; d++) {
      const s = ymd(vy, vm, d);
      const sel = selected.has(s);
      const past = s < todayStr && !sel;
      grid.append(h('button', {
        type: 'button',
        class: 'cal-day' + (sel ? ' sel' : '') + (past ? ' dis' : ''),
        disabled: past,
        onclick: () => {
          if (selected.has(s)) selected.delete(s);
          else if (selected.size >= LIMITS.dates) { toast(`候補日は${LIMITS.dates}日までです`); return; }
          else selected.add(s);
          draw();
          onChange();
        },
        text: String(d),
      }));
    }
    root.append(grid);
    countEl.textContent = `${selected.size}日 選択中（最大${LIMITS.dates}日）`;
  }
  draw();
  return { el: h('div', {}, root, countEl), redraw: draw };
}

// ---- イベント入力フォーム（作成・管理で共用） ----
function timeOptions(from, to, selected) {
  const opts = [];
  for (let t = from; t <= to; t += 15) {
    const v = fromMin(t);
    opts.push(h('option', { value: v, selected: v === selected }, v));
  }
  return opts;
}

function eventForm({ initial, submitLabel, lockSlot, onSubmit }) {
  const selected = new Set(initial.dates || []);
  const title = h('input', { type: 'text', maxlength: LIMITS.title, value: initial.title || '', placeholder: '例：10月の飲み会' });
  const memo = h('textarea', { maxlength: LIMITS.memo, placeholder: '場所・目的など（任意）' });
  memo.value = initial.memo || '';
  const start = h('select', {}, timeOptions(0, 23 * 60 + 45, initial.start_time));
  const end = h('select', {}, timeOptions(15, 24 * 60, initial.end_time));
  const step = h('select', { disabled: !!lockSlot },
    [[15, '15分'], [30, '30分'], [60, '1時間']].map(([v, l]) => h('option', { value: v, selected: v === initial.slot_minutes }, l)));
  const info = h('div', { class: 'muted' });
  const err = h('div', { class: 'error' });
  const btn = h('button', { type: 'submit', class: 'primary block' }, submitLabel);

  const cal = calendarPicker(selected, refresh);

  function value() {
    return {
      title: title.value.trim(),
      memo: memo.value.trim(),
      dates: [...selected].sort(),
      start_time: start.value,
      end_time: end.value,
      slot_minutes: Number(step.value),
    };
  }
  function refresh() {
    const v = value();
    const rows = toMin(v.end_time) > toMin(v.start_time) ? slotTimes(v.start_time, v.end_time, v.slot_minutes).length : 0;
    const total = rows * v.dates.length;
    info.textContent = `マス目：${v.dates.length}日 × ${rows}行 = ${total}マス（最大${LIMITS.slots}）`;
    info.style.color = total > LIMITS.slots ? 'var(--danger)' : '';
  }
  [start, end, step].forEach(e => e.addEventListener('change', refresh));
  refresh();

  const el = h('form', { class: 'card', novalidate: true },
    h('label', { class: 'field' }, 'タイトル ', h('span', { class: 'hint', text: `（必須・${LIMITS.title}文字以内）` }), title),
    h('label', { class: 'field' }, 'メモ ', h('span', { class: 'hint', text: `（${LIMITS.memo}文字以内）` }), memo),
    h('div', { class: 'field' }, h('div', { style: 'font-weight:600;font-size:.95rem', text: '候補日（複数選択）' }), cal.el),
    h('div', { class: 'row' },
      h('label', { class: 'field' }, '開始時刻', start),
      h('label', { class: 'field' }, '終了時刻', end)),
    h('label', { class: 'field' }, '時間の刻み',
      step,
      lockSlot ? h('span', { class: 'hint', text: '回答がある場合は変更できません' }) : null),
    info, err, btn);

  el.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const v = value();
    const msg = validate(v);
    if (msg) { err.textContent = msg; return; }
    btn.disabled = true;
    try {
      await onSubmit(v);
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });

  function validate(v) {
    if (!v.title) return 'タイトルを入力してください';
    if (v.dates.length < 1) return '候補日を選択してください';
    if (toMin(v.end_time) <= toMin(v.start_time)) return '終了時刻は開始時刻より後にしてください';
    if (slotTimes(v.start_time, v.end_time, v.slot_minutes).length * v.dates.length > LIMITS.slots) {
      return `マス目が多すぎます（最大${LIMITS.slots}マス）。候補日か時間帯を減らしてください`;
    }
    return '';
  }
  return { el, value };
}

// ---- グリッド共通 ----
function buildGrid(ev, className, fillCell) {
  const times = slotTimes(ev.start_time, ev.end_time, ev.slot_minutes);
  const head = h('tr', {}, h('th', { text: '' }), ev.dates.map(d => h('th', { text: fmtDate(d) })));
  const cells = new Map();
  const body = times.map(t => h('tr', {},
    h('th', { text: t }),
    ev.dates.map(d => {
      const key = slotKey(d, t);
      const td = h('td', { 'data-key': key });
      cells.set(key, td);
      fillCell(td, key);
      return td;
    })));
  const table = h('table', { class: 'grid ' + className }, h('thead', {}, head), h('tbody', {}, body));
  return { wrap: h('div', { class: 'grid-wrap' }, table), cells };
}

// 回答入力グリッド：タップで切り替え、なぞって一括変更
function answerGrid(ev, initialState) {
  let state = { ...initialState };
  const paint = (td, key) => {
    const v = state[key] || '';
    td.className = v ? 'v-' + v : '';
    td.textContent = v ? SYMBOLS[v] : '';
  };
  const { wrap, cells } = buildGrid(ev, 'answer-grid', paint);

  const apply = (key, v) => {
    if (v) state[key] = v; else delete state[key];
    paint(cells.get(key), key);
  };

  // マウスは押してなぞる。タッチは長押し(LONG_PRESS_MS)してからなぞり、
  // それ以外はブラウザのスクロールに任せる（動かさず離したときだけタップ扱い）
  const LONG_PRESS_MS = 300;
  const MOVE_TOLERANCE = 8;
  let painting = false;
  let paintValue = '';
  let lastKey = null;
  let pending = null; // タッチ開始後、長押し成立前の状態
  const keyAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const td = el && el.closest ? el.closest('td[data-key]') : null;
    return td && wrap.contains(td) ? td.dataset.key : null;
  };
  const nextValue = key => CYCLE[(CYCLE.indexOf(state[key] || '') + 1) % CYCLE.length];
  const startPaint = key => {
    paintValue = nextValue(key);
    painting = true;
    wrap.classList.add('painting');
    lastKey = key;
    apply(key, paintValue);
  };
  const clearPending = () => { if (pending) { clearTimeout(pending.timer); pending = null; } };

  wrap.addEventListener('pointerdown', e => {
    const key = keyAt(e.clientX, e.clientY);
    if (!key) return;
    if (e.pointerType === 'mouse') {
      e.preventDefault();
      startPaint(key);
      return;
    }
    clearPending();
    pending = {
      id: e.pointerId, key, x: e.clientX, y: e.clientY,
      timer: setTimeout(() => {
        const k = pending.key;
        pending = null;
        if (navigator.vibrate) navigator.vibrate(15);
        startPaint(k);
      }, LONG_PRESS_MS),
    };
  });
  wrap.addEventListener('pointermove', e => {
    if (pending && e.pointerId === pending.id &&
        Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > MOVE_TOLERANCE) clearPending(); // スクロール操作
    if (!painting) return;
    const key = keyAt(e.clientX, e.clientY);
    if (key && key !== lastKey) { lastKey = key; apply(key, paintValue); }
  });
  // なぞり入力中はスクロールさせない
  wrap.addEventListener('touchmove', e => { if (painting && e.cancelable) e.preventDefault(); }, { passive: false });
  wrap.addEventListener('contextmenu', e => e.preventDefault());
  const stop = e => {
    if (pending && e.type === 'pointerup' && e.pointerId === pending.id) {
      const k = pending.key;
      clearPending();
      apply(k, nextValue(k)); // タップ
    } else if (e.type === 'pointercancel') {
      clearPending();
    }
    painting = false;
    wrap.classList.remove('painting');
    lastKey = null;
  };
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);

  return {
    el: wrap,
    getState: () => ({ ...state }),
    setState(next) {
      state = { ...next };
      for (const [key, td] of cells) paint(td, key);
    },
  };
}

// 集計表の描画。戻り値の el を差し替えて使う
function summaryGrid(ev, answers, onCell, pickedKey) {
  const counts = {};
  for (const key of allKeys(ev)) counts[key] = { ok: 0, online: 0, maybe: 0 };
  for (const a of answers) {
    for (const [key, v] of Object.entries(a.slots)) if (counts[key] && v in counts[key]) counts[key][v]++;
  }
  const total = answers.length;
  const { wrap } = buildGrid(ev, 'sum-grid', (td, key) => {
    const c = counts[key];
    const going = c.ok + c.online;
    if (total > 0 && going === total) td.classList.add(c.online === 0 ? 'best-ok' : 'best-online');
    else if (going > 0) td.classList.add(`lv${Math.min(3, Math.ceil(going / total * 3))}`);
    if (key === pickedKey) td.classList.add('picked');
    for (const k of Object.keys(SYMBOLS)) {
      if (c[k]) td.append(h('span', { class: 'cnt', text: `${SYMBOLS[k]}${c[k]}` }), ' ');
    }
    td.addEventListener('click', () => onCell(key));
  });
  return wrap;
}
