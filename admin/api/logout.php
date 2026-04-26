<?php
require_once '_auth.php';
session_start();
session_destroy();
jsonOut(['success' => true]);
