<?php
function getDb() {
    static $db = null;
    if ($db !== null) return $db;

    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $db = new SQLite3($dir . '/kausachun.db');
    $db->enableExceptions(true);
    $db->exec("PRAGMA journal_mode=WAL");
    $db->exec("
        CREATE TABLE IF NOT EXISTS government_plan (
            id          INTEGER PRIMARY KEY,
            filename    TEXT NOT NULL,
            content     TEXT NOT NULL,
            uploaded_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS news (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT NOT NULL,
            excerpt    TEXT DEFAULT '',
            content    TEXT NOT NULL,
            image_url  TEXT DEFAULT '',
            published  INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            updated_at TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS videos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT DEFAULT '',
            youtube_id  TEXT NOT NULL,
            published   INTEGER DEFAULT 1,
            created_at  TEXT DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS contacts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            email      TEXT DEFAULT '',
            phone      TEXT DEFAULT '',
            message    TEXT NOT NULL,
            read       INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );
    ");
    return $db;
}

function dbRows($result) {
    $rows = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) $rows[] = $row;
    return $rows;
}

function jsonOut($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
