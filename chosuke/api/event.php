<?php
require_once __DIR__ . '/lib/util.php';

$body = read_body();
$method = effective_method($body);
$pdo = db();
$token = $_GET['token'] ?? ($body['token'] ?? null);

switch ($method) {
    case 'GET':
        if (isset($_GET['token'])) {
            $row = find_event_by_token($pdo, $_GET['token']);
            if (!$row) {
                fail('管理用URLが正しくありません', 403);
            }
            $ev = event_to_array($row);
            $ev['answer_count'] = count_answers($pdo, $row['id']);
            json_out(['event' => $ev]);
        }
        $row = find_event_by_id($pdo, $_GET['id'] ?? null);
        if (!$row) {
            fail('イベントが見つかりません', 404);
        }
        json_out(['event' => event_to_array($row)]);

    case 'POST':
        check_rate_limit($pdo);
        purge_expired($pdo);
        $in = validate_event_input($body);
        $id = random_hex(12);
        $adminToken = random_hex(32);
        $now = now_str();
        $st = $pdo->prepare('INSERT INTO events (id, admin_token, title, memo, dates, start_time, end_time, slot_minutes, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $st->execute([$id, $adminToken, $in['title'], $in['memo'], json_encode($in['dates']), $in['start_time'], $in['end_time'], $in['slot_minutes'], json_encode($in['options']), $now, $now]);
        json_out(['id' => $id, 'admin_token' => $adminToken], 201);

    case 'PUT':
        $row = find_event_by_token($pdo, $token);
        if (!$row) {
            fail('管理用URLが正しくありません', 403);
        }
        $in = validate_event_input($body);
        $answerCount = count_answers($pdo, $row['id']);
        if ($answerCount > 0 && $in['slot_minutes'] !== (int)$row['slot_minutes']) {
            fail('回答がある場合は時間の刻みを変更できません', 409);
        }

        $pdo->beginTransaction();
        $st = $pdo->prepare('UPDATE events SET title = ?, memo = ?, dates = ?, start_time = ?, end_time = ?, slot_minutes = ?, options = ?, updated_at = ? WHERE id = ?');
        $st->execute([$in['title'], $in['memo'], json_encode($in['dates']), $in['start_time'], $in['end_time'], $in['slot_minutes'], json_encode($in['options']), now_str(), $row['id']]);

        // 範囲外になったマスの回答を削除する
        $valid = array_flip(slot_keys($in['dates'], $in['start_time'], $in['end_time'], $in['slot_minutes']));
        $list = $pdo->prepare('SELECT id, slots FROM answers WHERE event_id = ?');
        $list->execute([$row['id']]);
        $upd = $pdo->prepare('UPDATE answers SET slots = ?, updated_at = ? WHERE id = ?');
        foreach ($list->fetchAll() as $a) {
            $slots = json_decode($a['slots'], true) ?: [];
            $kept = array_filter(array_intersect_key($slots, $valid), fn($v) => in_array($v, $in['options'], true));
            if (count($kept) !== count($slots)) {
                $upd->execute([json_encode((object)$kept), now_str(), $a['id']]);
            }
        }
        $pdo->commit();

        $row = find_event_by_id($pdo, $row['id']);
        json_out(['event' => event_to_array($row)]);

    case 'DELETE':
        $row = find_event_by_token($pdo, $token);
        if (!$row) {
            fail('管理用URLが正しくありません', 403);
        }
        $pdo->prepare('DELETE FROM events WHERE id = ?')->execute([$row['id']]);
        json_out(['ok' => true]);

    default:
        fail('許可されていないメソッドです', 405);
}
