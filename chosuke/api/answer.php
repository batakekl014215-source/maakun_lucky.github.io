<?php
require_once __DIR__ . '/lib/util.php';

$body = read_body();
$method = effective_method($body);
$pdo = db();

function find_answer(PDO $pdo, $id): ?array
{
    if (!is_scalar($id) || !ctype_digit((string)$id)) {
        return null;
    }
    $st = $pdo->prepare('SELECT * FROM answers WHERE id = ?');
    $st->execute([(int)$id]);
    return $st->fetch() ?: null;
}

switch ($method) {
    case 'GET':
        $event = find_event_by_id($pdo, $_GET['event_id'] ?? null);
        if (!$event) {
            fail('イベントが見つかりません', 404);
        }
        $st = $pdo->prepare('SELECT * FROM answers WHERE event_id = ? ORDER BY id');
        $st->execute([$event['id']]);
        json_out(['answers' => array_map('answer_to_array', $st->fetchAll())]);

    case 'POST':
        $event = find_event_by_id($pdo, $body['event_id'] ?? null);
        if (!$event) {
            fail('イベントが見つかりません', 404);
        }
        $name = clean_text($body['name'] ?? '', NAME_MAX, '名前', true);
        $slots = validate_slots($body['slots'] ?? null, $event);
        if (count_answers($pdo, $event['id']) >= ANSWERS_MAX) {
            fail('回答者の上限（' . ANSWERS_MAX . '人）に達しています', 409);
        }
        $editKey = random_hex(16);
        $now = now_str();
        $st = $pdo->prepare('INSERT INTO answers (event_id, name, edit_key, slots, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
        $st->execute([$event['id'], $name, $editKey, json_encode((object)$slots), $now, $now]);
        json_out(['id' => (int)$pdo->lastInsertId(), 'edit_key' => $editKey], 201);

    case 'PUT':
        // 簡易運用のため認証なし（edit_keyは「自分の回答」の判別用にブラウザへ保存する）
        $answer = find_answer($pdo, $_GET['id'] ?? ($body['id'] ?? null));
        if (!$answer) {
            fail('回答が見つかりません', 404);
        }
        $event = find_event_by_id($pdo, $answer['event_id']);
        $name = clean_text($body['name'] ?? '', NAME_MAX, '名前', true);
        $slots = validate_slots($body['slots'] ?? null, $event);
        $st = $pdo->prepare('UPDATE answers SET name = ?, slots = ?, updated_at = ? WHERE id = ?');
        $st->execute([$name, json_encode((object)$slots), now_str(), $answer['id']]);
        json_out(['answer' => answer_to_array(find_answer($pdo, $answer['id']))]);

    case 'DELETE':
        $answer = find_answer($pdo, $_GET['id'] ?? ($body['id'] ?? null));
        $event = $answer ? find_event_by_token($pdo, $_GET['token'] ?? ($body['token'] ?? null)) : null;
        if (!$answer || !$event || $event['id'] !== $answer['event_id']) {
            fail('削除する権限がありません', 403);
        }
        $pdo->prepare('DELETE FROM answers WHERE id = ?')->execute([$answer['id']]);
        json_out(['ok' => true]);

    default:
        fail('許可されていないメソッドです', 405);
}
