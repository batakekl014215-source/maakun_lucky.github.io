// イベント作成画面
'use strict';

const app = document.getElementById('app');

const form = eventForm({
  initial: { start_time: '18:00', end_time: '22:00', slot_minutes: 30, dates: [] },
  submitLabel: 'イベントを作成',
  onSubmit: async v => {
    const r = await api('event.php', { method: 'POST', body: v });
    showDone(v.title, r.id, r.admin_token);
  },
});
app.append(form.el);

function showDone(title, id, token) {
  app.replaceChildren(
    h('div', { class: 'card' },
      h('h2', { text: 'イベントを作成しました' }),
      h('p', { text: title }),
      h('h2', { text: '参加者用URL（みんなに共有）' }),
      copyRow(pageUrl('event.html', { id })),
      h('a', { href: pageUrl('event.html', { id }), text: '回答ページを開く' }),
      h('h2', { style: 'margin-top:20px', text: '管理用URL（あなた専用）' }),
      copyRow(pageUrl('admin.html', { token })),
      h('div', { class: 'notice', text: '⚠️ 管理用URLは主催者以外に共有しないでください。この画面を閉じると再表示できないので、必ず保存してください。' }),
      h('a', { href: pageUrl('admin.html', { token }), text: '管理ページを開く' })));
  window.scrollTo(0, 0);
}
