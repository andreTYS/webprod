<?php
require_once '../db.php';
jsonOut(dbRows(getDb()->query(
    'SELECT * FROM videos WHERE published=1 ORDER BY created_at DESC'
)));
