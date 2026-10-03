// 回答＋集計画面
'use strict';

const app = document.getElementById('app');
const eventId = new URLSearchParams(location.search).get('id') || '';
const STORE_KEY = 'chousei_' + eventId;
const store = Object.assign({ mine: {}, name: '' }, loadStore(STORE_KEY));

let ev = null;
let answers = [];
let editingId = null;
let pickedKey = null;
let grid = null;

const nameInput = h('input', { type: 'text', maxlength: LIMITS.name, placeholder: '名前（20文字以内）', value: store.name || '' });
const editBar = h('div', { class: 'edit-bar' });
const gridBox = h('div');
const saveErr = h('div', { class: 'error' });
const saveBtn = h('button', { type: 'button', class: 'primary block', onclick: save }, '保存');
const summaryBox = h('div');
const detailBox = h('div', { class: 'detail' });
const namesBox = h('div', { class: 'names' });

init();

async function init() {
  try {
    ev = (await api('event.php', { query: { id: eventId } })).event;
    answers = (await api('answer.php', { query: { event_id: eventId } })).answers;
  } catch (e) {
    app.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'error', text: e.message })));
    return;
  }
  document.title = `${ev.title} | 日程調整`;

  grid = answerGrid(ev, {});
  gridBox.replaceChildren(grid.el);

  app.replaceChildren(
    h('h1', { text: ev.title }),
    ...(ev.memo ? [h('p', { class: 'memo', text: ev.memo })] : []),
    h('div', { class: 'card' },
      h('h2', { text: '回答する' }),
      editBar,
      h('label', { class: 'field' }, 'お名前', nameInput),
      h('p', { class: 'muted', text: 'マスをタップで ⭕️→💻→△→空欄（空欄は不可の扱い）。なぞると同じ記号をまとめて入力できます（横にずらすときは日付・時間の見出しをスワイプ）。' }),
      gridBox, saveErr, h('div', { style: 'margin-top:12px' }, saveBtn)),
    h('div', { class: 'card' },
      h('h2', { text: 'みんなの回答' }),
      summaryBox,
      detailBox),
    h('div', { class: 'card' },
      h('h2', { text: '回答者（タップで修正）' }),
      namesBox),
    legend());

  // この端末で保存した自分の回答があれば読み込む
  const mine = answers.find(a => store.mine[a.id]);
  if (mine) startEdit(mine); else renderEditBar();
  renderAll();
}

function renderAll() {
  summaryBox.replaceChildren(summaryGrid(ev, answers, onCell, pickedKey));
  renderDetail();
  renderNames();
}

function renderEditBar() {
  if (editingId == null) {
    editBar.replaceChildren(h('span', { class: 'muted', text: '新しい回答を入力中' }));
    return;
  }
  const a = answers.find(x => x.id === editingId);
  editBar.replaceChildren(
    h('span', { text: `「${a ? a.name : ''}」の回答を修正中` }),
    h('button', { type: 'button', class: 'small', onclick: startNew }, '新規回答にする'));
}

function startEdit(a) {
  editingId = a.id;
  nameInput.value = a.name;
  grid.setState(a.slots);
  saveErr.textContent = '';
  renderEditBar();
}

function startNew() {
  editingId = null;
  nameInput.value = '';
  grid.setState({});
  renderEditBar();
}

function onCell(key) {
  pickedKey = pickedKey === key ? null : key;
  renderAll();
}

function renderDetail() {
  if (!pickedKey) { detailBox.replaceChildren(); return; }
  const [date, time] = pickedKey.split('_');
  const dl = h('dl', {});
  for (const k of Object.keys(SYMBOLS)) {
    const names = answers.filter(a => a.slots[pickedKey] === k).map(a => a.name);
    if (names.length) dl.append(h('dt', { text: `${SYMBOLS[k]} ${LABELS[k]}（${names.length}人）` }), h('dd', { text: names.join('、') }));
  }
  const none = answers.filter(a => !a.slots[pickedKey]).map(a => a.name);
  if (none.length) dl.append(h('dt', { text: `空欄＝不可（${none.length}人）` }), h('dd', { text: none.join('、') }));
  detailBox.replaceChildren(h('h2', { text: `${fmtDate(date)} ${time}` }), answers.length ? dl : h('p', { class: 'muted', text: 'まだ回答がありません' }));
}

function renderNames() {
  if (!answers.length) {
    namesBox.replaceChildren(h('span', { class: 'muted', text: 'まだ回答がありません' }));
    return;
  }
  namesBox.replaceChildren(...answers.map(a => h('button', {
    type: 'button',
    class: 'chip' + (store.mine[a.id] ? ' mine' : ''),
    onclick: () => { startEdit(a); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  }, a.name + (store.mine[a.id] ? '（自分）' : ''))));
}

async function save() {
  saveErr.textContent = '';
  const name = nameInput.value.trim();
  if (!name) { saveErr.textContent = '名前を入力してください'; return; }
  const slots = grid.getState();
  saveBtn.disabled = true;
  try {
    if (editingId != null) {
      await api('answer.php', { query: { id: editingId }, body: { action: 'update', name, slots, edit_key: store.mine[editingId] || '' } });
    } else {
      const r = await api('answer.php', { body: { event_id: eventId, name, slots } });
      store.mine[r.id] = r.edit_key;
      editingId = r.id;
    }
    store.name = name;
    saveStore(STORE_KEY, store);
    answers = (await api('answer.php', { query: { event_id: eventId } })).answers;
    renderEditBar();
    renderAll();
    toast('保存しました');
  } catch (e) {
    saveErr.textContent = e.message;
  } finally {
    saveBtn.disabled = false;
  }
}
