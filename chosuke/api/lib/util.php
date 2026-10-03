<?php
require_once __DIR__ . '/db.php';

set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'サーバーでエラーが発生しました'], JSON_UNESCAPED_UNICODE);
});

function json_out($data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never
{
    json_out(['error' => $message], $status);
}

function read_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('リクエストの形式が正しくありません');
    }
    return $data;
}

// PUT/DELETEが通らない環境向けに、POST+action でも同じ操作にできる
function effective_method(array $body): string
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? ($body['action'] ?? '');
    if ($method === 'POST' && $action === 'update') {
        return 'PUT';
    }
    if ($method === 'POST' && $action === 'delete') {
        return 'DELETE';
    }
    return $method;
}

function random_hex(int $length): string
{
    return substr(bin2hex(random_bytes((int)ceil($length / 2))), 0, $length);
}

function now_str(): string
{
    return date('Y-m-d H:i:s');
}

function str_len(string $s): int
{
    return mb_strlen($s, 'UTF-8');
}

function clean_text($value, int $max, string $label, bool $required): string
{
    if ($value !== null && !is_string($value)) {
        fail("{$label}の形式が正しくありません");
    }
    $s = trim((string)$value);
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    if ($required && $s === '') {
        fail("{$label}を入力してください");
    }
    if (str_len($s) > $max) {
        fail("{$label}は{$max}文字以内で入力してください");
    }
    return $s;
}

function time_to_minutes(string $t): int
{
    [$h, $m] = explode(':', $t);
    return (int)$h * 60 + (int)$m;
}

function minutes_to_time(int $min): string
{
    return sprintf('%02d:%02d', intdiv($min, 60), $min % 60);
}

// マスのキー「日付_開始時刻」の一覧を返す
function slot_keys(array $dates, string $start, string $end, int $step): array
{
    $keys = [];
    for ($t = time_to_minutes($start); $t < time_to_minutes($end); $t += $step) {
        foreach ($dates as $d) {
            $keys[] = $d . '_' . minutes_to_time($t);
        }
    }
    return $keys;
}

// イベント入力を検証して正規化する
function validate_event_input(array $b): array
{
    $title = clean_text($b['title'] ?? '', TITLE_MAX, 'タイトル', true);
    $memo = clean_text($b['memo'] ?? '', MEMO_MAX, 'メモ', false);

    $dates = $b['dates'] ?? null;
    if (!is_array($dates) || count($dates) < 1) {
        fail('候補日を選択してください');
    }
    $clean = [];
    foreach ($dates as $d) {
        if (!is_string($d) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m)
            || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
            fail('候補日の形式が正しくありません');
        }
        $clean[$d] = true;
    }
    $dates = array_keys($clean);
    sort($dates);
    if (count($dates) > DATES_MAX) {
        fail('候補日は' . DATES_MAX . '日までです');
    }

    $start = $b['start_time'] ?? '';
    $end = $b['end_time'] ?? '';
    if (!is_string($start) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $start)) {
        fail('開始時刻が正しくありません');
    }
    if (!is_string($end) || !preg_match('/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/', $end)) {
        fail('終了時刻が正しくありません');
    }
    if (time_to_minutes($start) >= time_to_minutes($end)) {
        fail('終了時刻は開始時刻より後にしてください');
    }

    $step = $b['slot_minutes'] ?? null;
    if (!is_int($step) || !in_array($step, SLOT_MINUTES_ALLOWED, true)) {
        fail('時間の刻みが正しくありません');
    }

    if (count(slot_keys($dates, $start, $end, $step)) > SLOTS_MAX) {
        fail('マス目が多すぎます（最大' . SLOTS_MAX . 'マス）。候補日か時間帯を減らしてください');
    }

    return [
        'title' => $title,
        'memo' => $memo,
        'dates' => $dates,
        'start_time' => $start,
        'end_time' => $end,
        'slot_minutes' => $step,
    ];
}

function event_to_array(array $row, bool $withToken = false): array
{
    $ev = [
        'id' => $row['id'],
        'title' => $row['title'],
        'memo' => $row['memo'],
        'dates' => json_decode($row['dates'], true) ?: [],
        'start_time' => $row['start_time'],
        'end_time' => $row['end_time'],
        'slot_minutes' => (int)$row['slot_minutes'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
    if ($withToken) {
        $ev['admin_token'] = $row['admin_token'];
    }
    return $ev;
}

function find_event_by_id(PDO $pdo, $id): ?array
{
    if (!is_string($id) || !preg_match('/^[0-9a-f]{12}$/', $id)) {
        return null;
    }
    $st = $pdo->prepare('SELECT * FROM events WHERE id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function find_event_by_token(PDO $pdo, $token): ?array
{
    if (!is_string($token) || !preg_match('/^[0-9a-f]{32}$/', $token)) {
        return null;
    }
    $st = $pdo->prepare('SELECT * FROM events WHERE admin_token = ?');
    $st->execute([$token]);
    $row = $st->fetch();
    return ($row && hash_equals($row['admin_token'], $token)) ? $row : null;
}

function count_answers(PDO $pdo, string $eventId): int
{
    $st = $pdo->prepare('SELECT COUNT(*) FROM answers WHERE event_id = ?');
    $st->execute([$eventId]);
    return (int)$st->fetchColumn();
}

function answer_to_array(array $row): array
{
    $slots = json_decode($row['slots'], true);
    return [
        'id' => (int)$row['id'],
        'event_id' => $row['event_id'],
        'name' => $row['name'],
        'slots' => (object)(is_array($slots) ? $slots : []),
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

// 同じIPからの連続作成を制限する
function check_rate_limit(PDO $pdo): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $now = time();
    $pdo->prepare('DELETE FROM rate_limits WHERE created_at < ?')->execute([$now - 3600]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM rate_limits WHERE ip = ? AND created_at >= ?');
    $st->execute([$ip, $now - RATE_LIMIT_SECONDS]);
    if ((int)$st->fetchColumn() >= RATE_LIMIT_COUNT) {
        fail('作成回数が多すぎます。しばらくしてからお試しください', 429);
    }
    $pdo->prepare('INSERT INTO rate_limits (ip, created_at) VALUES (?, ?)')->execute([$ip, $now]);
}

// 最終候補日から保持日数を過ぎたイベントを削除する
function purge_expired(PDO $pdo): void
{
    $limit = date('Y-m-d', strtotime('-' . RETENTION_DAYS . ' days'));
    $ids = [];
    foreach ($pdo->query('SELECT id, dates FROM events') as $row) {
        $dates = json_decode($row['dates'], true);
        if (is_array($dates) && $dates && max($dates) < $limit) {
            $ids[] = $row['id'];
        }
    }
    $del = $pdo->prepare('DELETE FROM events WHERE id = ?');
    foreach ($ids as $id) {
        $del->execute([$id]);
    }
}

// 回答のマスを検証して返す（不正なら終了）
function validate_slots($slots, array $event): array
{
    if ($slots === null || $slots === []) {
        return [];
    }
    if (!is_array($slots)) {
        fail('回答の形式が正しくありません');
    }
    $dates = json_decode($event['dates'], true) ?: [];
    $valid = array_flip(slot_keys($dates, $event['start_time'], $event['end_time'], (int)$event['slot_minutes']));
    $out = [];
    foreach ($slots as $key => $value) {
        if (!is_string($key) || !isset($valid[$key]) || !is_string($value) || !in_array($value, ANSWER_VALUES, true)) {
            fail('回答の内容が正しくありません');
        }
        $out[$key] = $value;
    }
    return $out;
}
