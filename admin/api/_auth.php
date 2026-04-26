<?php
require_once '../../db.php';
require_once '../../config.php';

function requireAuth() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['admin'])) jsonOut(['error' => 'No autorizado'], 401);
}
