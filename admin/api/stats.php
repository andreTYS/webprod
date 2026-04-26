<?php
require_once '_auth.php';
requireAuth();
$db = getDb();
jsonOut([
    'news'     => (int)$db->querySingle('SELECT COUNT(*) FROM news'),
    'videos'   => (int)$db->querySingle('SELECT COUNT(*) FROM videos'),
    'contacts' => (int)$db->querySingle('SELECT COUNT(*) FROM contacts'),
    'unread'   => (int)$db->querySingle('SELECT COUNT(*) FROM contacts WHERE read=0'),
    'hasPlan'  => (bool)$db->querySingle('SELECT id FROM government_plan LIMIT 1'),
]);
