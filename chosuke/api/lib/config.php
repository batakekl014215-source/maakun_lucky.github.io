<?php
// 共通設定

date_default_timezone_set('Asia/Tokyo');

// DBの置き場所：環境変数 CHOUSEI_DATA_DIR があればそれを使い、
// なければ公開ディレクトリ（このツールのフォルダ）の1つ上の chousei_data/
$envDir = getenv('CHOUSEI_DATA_DIR');
define('DATA_DIR', $envDir !== false && $envDir !== ''
    ? rtrim($envDir, '/')
    : dirname(__DIR__, 3) . '/chousei_data');
define('DB_PATH', DATA_DIR . '/chousei.sqlite');

// 入力の上限値
const TITLE_MAX = 50;
const MEMO_MAX = 200;
const NAME_MAX = 20;
const DATES_MAX = 31;
const SLOTS_MAX = 500;        // 日数×時間枠の最大マス数
const ANSWERS_MAX = 30;       // 1イベントあたりの最大回答者数
const SLOT_MINUTES_ALLOWED = [15, 30, 60];
const ANSWER_VALUES = ['ok', 'online', 'maybe'];

// 作成の簡易レート制限（1IPあたり）
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_SECONDS = 60;

// 最終候補日からの保持日数
const RETENTION_DAYS = 90;
