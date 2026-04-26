<?php
require_once '_auth.php';
requireAuth();
$db     = getDb();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $r = $db->query("SELECT id, filename, uploaded_at, length(content) as chars, substr(content,1,600) as preview FROM government_plan ORDER BY id DESC LIMIT 1");
    jsonOut($r->fetchArray(SQLITE3_ASSOC) ?: null);

} elseif ($method === 'POST') {
    $content  = '';
    $filename = '';

    if (!empty($_FILES['file']['tmp_name'])) {
        $filename = $_FILES['file']['name'];
        $ext      = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $tmp      = $_FILES['file']['tmp_name'];

        if ($ext === 'pdf') {
            // Intenta pdftotext (requiere poppler-utils en el servidor)
            $out = @shell_exec('pdftotext ' . escapeshellarg($tmp) . ' - 2>/dev/null');
            if ($out) {
                $content = $out;
            } else {
                // Extracción básica de texto en PDF
                $raw = file_get_contents($tmp);
                preg_match_all('/\(([^\)\\\\]*(?:\\\\.[^\)\\\\]*)*)\)\s*Tj/', $raw, $m);
                $content = implode(' ', $m[1]);
                if (!trim($content)) jsonOut(['error' => 'No se pudo leer el PDF. Usa "Texto directo" o instala poppler-utils en el servidor.'], 400);
            }
        } else {
            $content = file_get_contents($tmp);
        }
    } else {
        // Texto enviado como form-data o JSON
        $content  = $_POST['content'] ?? (json_decode(file_get_contents('php://input'), true)['content'] ?? '');
        $filename = 'plan-manual.txt';
    }

    if (!trim($content)) jsonOut(['error' => 'Se requiere un archivo o texto del plan'], 400);

    $db->exec('DELETE FROM government_plan');
    $st = $db->prepare('INSERT INTO government_plan (filename, content) VALUES (:f,:c)');
    $st->bindValue(':f', $filename);
    $st->bindValue(':c', $content);
    $st->execute();
    jsonOut(['success' => true, 'chars' => strlen($content)]);

} elseif ($method === 'DELETE') {
    $db->exec('DELETE FROM government_plan');
    jsonOut(['success' => true]);
}
