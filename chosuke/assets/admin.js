// 管理画面
'use strict';

const app = document.getElementById('app');
const token = new URLSearchParams(location.search).get('token') || '';

let ev = null;
let answers = [];

init();

async function init() {
  try {
    await load();
  } catch (e) {
    app.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'error', text: e.message })));
    return;
  }
  render();
}

async function load() {
  ev = (await api('event.php', { query: { token } })).event;
  answers = (await api('answer.php', { query: { event_id: ev.id } })).answers;
}

function render() {
  document.title = `管理：${ev.title} | 日程調整`;
  const form = eventForm({
    initial: ev,
    submitLabel: '変更を保存',
    lockSlot: answers.length > 0,
    onSubmit: async v => {
      if (!confirmRemoval(v)) return;
      await api('event.php', { query: { token }, body: { action: 'update', ...v } });
      await load();
      render();
      toast('保存しました');
    },
  });

  app.replaceChildren(
    h('h1', { text: '管理：' + ev.title }),
    h('div', { class: 'card' },
      h('h2', { text: '参加者用URL' }),
      copyRow(pageUrl('event.html', { id: ev.id })),
      h('a', { href: pageUrl('event.html', { id: ev.id }), text: '回答ページを開く' })),
    h('h2', { text: 'イベントの編集' }),
    form.el,
    h('div', { class: 'card' },
      h('h2', { text: `回答の管理（${answers.length}人）` }),
      answers.length
        ? h('ul', { class: 'answer-list' }, answers.map(a => h('li', {},
          h('span', { text: a.name }),
          h('button', { type: 'button', class: 'danger small', onclick: () => removeAnswer(a) }, '削除'))))
        : h('p', { class: 'muted', text: 'まだ回答がありません' })),
    h('div', { class: 'card' },
      h('h2', { text: 'イベントの削除' }),
      h('p', { class: 'muted', text: 'イベントと全員の回答を削除します。元に戻せません。' }),
      h('button', { type: 'button', class: 'danger', onclick: removeEvent }, 'このイベントを削除')));
}

// 候補日・時間帯を減らすと、そのマスの回答が消える。影響があれば確認する
function confirmRemoval(v) {
  const next = new Set(allKeys({ ...ev, ...v }));
  const removed = new Set(allKeys(ev).filter(k => !next.has(k)));
  if (!removed.size) return true;
  const affected = answers.filter(a => Object.keys(a.slots).some(k => removed.has(k)));
  if (!affected.length) return true;
  return confirm(`候補日・時間帯を減らすため、${removed.size}マス分の回答（${affected.length}人分）が削除されます。よろしいですか？`);
}

async function removeAnswer(a) {
  if (!confirm(`「${a.name}」さんの回答を削除しますか？`)) return;
  try {
    await api('answer.php', { query: { id: a.id, token }, body: { action: 'delete' } });
    await load();
    render();
    toast('削除しました');
  } catch (e) {
    alert(e.message);
  }
}

async function removeEvent() {
  if (!confirm('イベントと全員の回答を削除します。本当によろしいですか？')) return;
  try {
    await api('event.php', { query: { token }, body: { action: 'delete' } });
    app.replaceChildren(h('div', { class: 'card' },
      h('h2', { text: 'イベントを削除しました' }),
      h('a', { href: 'index.html', text: '新しいイベントを作成する' })));
  } catch (e) {
    alert(e.message);
  }
}
