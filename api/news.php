<?php
require_once '../db.php';
$db = getDb();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($id) {
    $st = $db->prepare('SELECT * FROM news WHERE id=:id AND published=1');
    $st->bindValue(':id', $id, SQLITE3_INTEGER);
    $row = $st->execute()->fetchArray(SQLITE3_ASSOC);
    $row ? jsonOut($row) : jsonOut(['error' => 'Noticia no encontrada'], 404);
} else {
    jsonOut(dbRows($db->query(
        'SELECT id,title,excerpt,image_url,created_at FROM news WHERE published=1 ORDER BY created_at DESC'
    )));
}
