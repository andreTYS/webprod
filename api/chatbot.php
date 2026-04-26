<?php
require_once '../config.php';
require_once '../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonOut(['error' => 'Method not allowed'], 405);
if (!ANTHROPIC_API_KEY)                    jsonOut(['error' => 'Chatbot no configurado'], 503);

$i       = json_decode(file_get_contents('php://input'), true) ?? [];
$message = trim($i['message'] ?? '');
$history = $i['history'] ?? [];
if (!$message) jsonOut(['error' => 'Mensaje requerido'], 400);

$plan = getDb()->querySingle('SELECT content FROM government_plan ORDER BY id DESC LIMIT 1');
$planText = $plan
    ? "=== PLAN DE GOBIERNO ===\n{$plan}\n=== FIN DEL PLAN ==="
    : 'El plan de gobierno se está preparando. Incluye propuestas concretas para minería responsable, agricultura, turismo, educación y salud en Moquegua.';

$system = "Eres el asistente virtual oficial de KAUSACHUN, movimiento político de Jaime Rodriguez Villanueva, candidato a Gobernador Regional de Moquegua, Perú.

{$planText}

REGLAS:
- Responde siempre en español peruano, tono optimista y cercano.
- Máximo 180 palabras por respuesta.
- No inventes datos fuera del plan de gobierno.
- Si te preguntan algo ajeno, redirige amablemente.";

$messages = [];
foreach (array_slice($history, -8) as $h) {
    $messages[] = [
        'role'    => ($h['role'] === 'assistant') ? 'assistant' : 'user',
        'content' => substr((string)($h['content'] ?? ''), 0, 800)
    ];
}
$messages[] = ['role' => 'user', 'content' => substr($message, 0, 1000)];

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_POSTFIELDS     => json_encode([
        'model'      => 'claude-haiku-4-5-20251001',
        'max_tokens' => 400,
        'system'     => $system,
        'messages'   => $messages
    ]),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01'
    ]
]);

$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200) jsonOut(['error' => 'Error al conectar con el chatbot. Intenta nuevamente.'], 500);

$data = json_decode($resp, true);
jsonOut(['reply' => $data['content'][0]['text']]);
