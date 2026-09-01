<?php
/**
 * Configuration de l'agent marketing — FICHIER EXEMPLE.
 *
 * Ce fichier est safe à commiter sur GitHub (aucune vraie clé dedans).
 *
 * Pour l'utiliser :
 *   1. Copie ce fichier en "config.php" (qui, lui, est ignoré par git)
 *   2. Remplace COLLE_TA_CLE_GEMINI_ICI par ta vraie clé
 *
 * En production, préfère une variable d'environnement plutôt que d'écrire
 * la clé en dur, même dans config.php :
 *   export GEMINI_API_KEY="ta-cle"
 */

define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: 'COLLE_TA_CLE_GEMINI_ICI');

// Endpoint compatible OpenAI exposé par Google pour Gemini.
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');

// Modèle utilisé (gratuit, rapide, bon niveau en français).
define('GEMINI_MODEL', 'gemini-3.6-flash');

// Chemins vers le prompt système et la base de connaissances.
define('SYSTEM_PROMPT_PATH', __DIR__ . '/system-prompt.md');
define('KNOWLEDGE_DIR', __DIR__ . '/knowledge');
