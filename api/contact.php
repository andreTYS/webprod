<?php
require_once '../db.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonOut(['error' => 'Method not allowed'], 405);

$i    = json_decode(file_get_contents('php://input'), true) ?? [];
$name = trim($i['name'] ?? '');
$msg  = trim($i['message'] ?? '');
if (!$name || !$msg) jsonOut(['error' => 'Nombre y mensaje son requeridos'], 400);

$db = getDb();
$st = $db->prepare('INSERT INTO contacts (name,email,phone,message) VALUES (:n,:e,:p,:m)');
$st->bindValue(':n', substr($name, 0, 200));
$st->bindValue(':e', substr(trim($i['email'] ?? ''), 0, 200));
$st->bindValue(':p', substr(trim($i['phone'] ?? ''), 0, 50));
$st->bindValue(':m', substr($msg, 0, 2000));
$st->execute();

jsonOut(['success' => true, 'message' => '¡Mensaje enviado! Gracias por contactarnos.']);
