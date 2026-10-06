<?php
require_once __DIR__ . '/config.php';

// PDO(SQLite)接続を返す。初回接続時にテーブルを自動作成する。
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    if (!is_dir(DATA_DIR) && !mkdir(DATA_DIR, 0700, true) && !is_dir(DATA_DIR)) {
        throw new RuntimeException('データディレクトリを作成できません');
    }

    $pdo = new PDO('sqlite:' . DB_PATH, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');

    init_schema($pdo);
    return $pdo;
}

function init_schema(PDO $pdo): void
{
    $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS events (
    id            TEXT PRIMARY KEY,
    admin_token   TEXT NOT NULL,
    title         TEXT NOT NULL,
    memo          TEXT NOT NULL DEFAULT '',
    dates         TEXT NOT NULL,
    start_time    TEXT NOT NULL,
    end_time      TEXT NOT NULL,
    slot_minutes  INTEGER NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
)
SQL);

    $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS answers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    edit_key    TEXT NOT NULL,
    slots       TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
)
SQL);

    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_answers_event_id ON answers(event_id)');

    // 回答の選択肢（既存DBには列を追加。既存イベントは3種類すべて）
    $cols = array_column($pdo->query('PRAGMA table_info(events)')->fetchAll(), 'name');
    if (!in_array('options', $cols, true)) {
        $pdo->exec('ALTER TABLE events ADD COLUMN options TEXT NOT NULL DEFAULT \'["ok","online","maybe"]\'');
    }

    // イベント作成の簡易レート制限用
    $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS rate_limits (
    ip          TEXT NOT NULL,
    created_at  INTEGER NOT NULL
)
SQL);
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip, created_at)');
}
