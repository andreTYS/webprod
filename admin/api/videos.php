<?php
require_once '_auth.php';
requireAuth();
$db     = getDb();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

function ytId($url) {
    preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/', $url, $m);
    return $m[1] ?? trim($url);
}

if ($method === 'GET') {
    jsonOut(dbRows($db->query('SELECT * FROM videos ORDER BY created_at DESC')));

} elseif ($method === 'POST') {
    $i = json_decode(file_get_contents('php://input'), true) ?? [];
    if (!trim($i['title'] ?? '') || !trim($i['youtube_url'] ?? '')) jsonOut(['error' => 'Título y URL requeridos'], 400);
    $st = $db->prepare('INSERT INTO videos (title,description,youtube_id,published) VALUES (:t,:d,:y,:p)');
    $st->bindValue(':t', $i['title']);
    $st->bindValue(':d', $i['description'] ?? '');
    $st->bindValue(':y', ytId($i['youtube_url']));
    $st->bindValue(':p', ($i['published'] ?? true) ? 1 : 0, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true, 'id' => $db->lastInsertRowID()]);

} elseif ($method === 'PUT' && $id) {
    $i  = json_decode(file_get_contents('php://input'), true) ?? [];
    $st = $db->prepare('UPDATE videos SET title=:t,description=:d,youtube_id=:y,published=:p WHERE id=:id');
    $st->bindValue(':t',  $i['title']       ?? '');
    $st->bindValue(':d',  $i['description'] ?? '');
    $st->bindValue(':y',  ytId($i['youtube_url'] ?? ''));
    $st->bindValue(':p',  ($i['published'] ?? true) ? 1 : 0, SQLITE3_INTEGER);
    $st->bindValue(':id', $id, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true]);

} elseif ($method === 'DELETE' && $id) {
    $st = $db->prepare('DELETE FROM videos WHERE id=:id');
    $st->bindValue(':id', $id, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true]);
}
