<?php
require_once '_auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonOut(['error' => 'Method not allowed'], 405);

session_start();
$i = json_decode(file_get_contents('php://input'), true) ?? [];
if (($i['password'] ?? '') === ADMIN_PASSWORD) {
    $_SESSION['admin'] = true;
    jsonOut(['success' => true]);
} else {
    jsonOut(['error' => 'Contraseña incorrecta'], 401);
}
