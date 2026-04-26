<?php
require_once '_auth.php';
requireAuth();
$db     = getDb();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($method === 'GET') {
    jsonOut(dbRows($db->query('SELECT * FROM news ORDER BY created_at DESC')));

} elseif ($method === 'POST') {
    $i = json_decode(file_get_contents('php://input'), true) ?? [];
    if (!trim($i['title'] ?? '') || !trim($i['content'] ?? '')) jsonOut(['error' => 'Título y contenido requeridos'], 400);
    $st = $db->prepare('INSERT INTO news (title,excerpt,content,image_url,published) VALUES (:t,:e,:c,:i,:p)');
    $st->bindValue(':t', $i['title']);
    $st->bindValue(':e', $i['excerpt'] ?? '');
    $st->bindValue(':c', $i['content']);
    $st->bindValue(':i', $i['image_url'] ?? '');
    $st->bindValue(':p', ($i['published'] ?? true) ? 1 : 0, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true, 'id' => $db->lastInsertRowID()]);

} elseif ($method === 'PUT' && $id) {
    $i  = json_decode(file_get_contents('php://input'), true) ?? [];
    $st = $db->prepare("UPDATE news SET title=:t,excerpt=:e,content=:c,image_url=:i,published=:p,updated_at=datetime('now','localtime') WHERE id=:id");
    $st->bindValue(':t',  $i['title']     ?? '');
    $st->bindValue(':e',  $i['excerpt']   ?? '');
    $st->bindValue(':c',  $i['content']   ?? '');
    $st->bindValue(':i',  $i['image_url'] ?? '');
    $st->bindValue(':p',  ($i['published'] ?? true) ? 1 : 0, SQLITE3_INTEGER);
    $st->bindValue(':id', $id, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true]);

} elseif ($method === 'DELETE' && $id) {
    $st = $db->prepare('DELETE FROM news WHERE id=:id');
    $st->bindValue(':id', $id, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true]);
}
