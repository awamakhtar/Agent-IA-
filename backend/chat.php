<?php
/**
 * Endpoint de chat de l'agent marketing Africa Shopping.
 *
 * Reçoit : { "message": "...", "history": [{ "role": "user"|"assistant", "content": "..." }] }
 * Renvoie : { "reply": "..." }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // à restreindre à ton domaine Next.js en production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée. Utilise POST.']);
    exit;
}

require __DIR__ . '/config.php';
require __DIR__ . '/knowledge-loader.php';

$input = json_decode(file_get_contents('php://input'), true);
$userMessage = trim($input['message'] ?? '');
$history = $input['history'] ?? [];

if ($userMessage === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Le champ "message" est requis.']);
    exit;
}

if (GEMINI_API_KEY === 'COLLE_TA_CLE_GEMINI_ICI') {
    http_response_code(500);
    echo json_encode(['error' => 'Clé API Gemini non configurée. Modifie config.php ou la variable d\'environnement GEMINI_API_KEY.']);
    exit;
}

// Construit la liste de messages : system prompt + base de connaissances, puis historique, puis nouveau message.
$messages = [
    ['role' => 'system', 'content' => build_full_system_prompt()],
];

foreach ($history as $turn) {
    if (isset($turn['role'], $turn['content']) && in_array($turn['role'], ['user', 'assistant'], true)) {
        $messages[] = ['role' => $turn['role'], 'content' => $turn['content']];
    }
}

$messages[] = ['role' => 'user', 'content' => $userMessage];

$payload = json_encode([
    'model' => GEMINI_MODEL,
    'messages' => $messages,
    'temperature' => 0.7,
]);

$ch = curl_init(GEMINI_API_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . GEMINI_API_KEY,
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 60,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Erreur réseau vers l\'API Gemini : ' . $curlError]);
    exit;
}

$decoded = json_decode($response, true);

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode([
        'error' => 'Erreur API Gemini',
        'details' => $decoded,
    ]);
    exit;
}

$reply = $decoded['choices'][0]['message']['content'] ?? null;

if ($reply === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Réponse inattendue de l\'API.', 'raw' => $decoded]);
    exit;
}

echo json_encode(['reply' => $reply]);
