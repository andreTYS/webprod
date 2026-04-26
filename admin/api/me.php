<?php
require_once '_auth.php';
requireAuth();
jsonOut(['ok' => true]);
