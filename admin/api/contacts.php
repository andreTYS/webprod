<?php
require_once '_auth.php';
requireAuth();
$db     = getDb();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    jsonOut(dbRows($db->query('SELECT * FROM contacts ORDER BY created_at DESC')));

} elseif ($method === 'PUT' && $id && $action === 'read') {
    $st = $db->prepare('UPDATE contacts SET read=1 WHERE id=:id');
    $st->bindValue(':id', $id, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true]);

} elseif ($method === 'DELETE' && $id) {
    $st = $db->prepare('DELETE FROM contacts WHERE id=:id');
    $st->bindValue(':id', $id, SQLITE3_INTEGER);
    $st->execute();
    jsonOut(['success' => true]);
}
