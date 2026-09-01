<?php
/**
 * Charge le contenu de la base de connaissances (knowledge/) et le concatène
 * pour l'injecter dans le prompt système envoyé au modèle.
 *
 * Pour le MVP V1, on charge TOUT le dossier knowledge/ (il est petit).
 * Quand la base grossira, on pourra passer à une sélection intelligente
 * (recherche par mots-clés, ou une vraie recherche vectorielle).
 */

function load_knowledge_base(string $dir): string
{
    if (!is_dir($dir)) {
        return '';
    }

    $chunks = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'md') {
            $relativePath = str_replace($dir . DIRECTORY_SEPARATOR, '', $file->getPathname());
            $content = file_get_contents($file->getPathname());
            $chunks[] = "--- CONTENU: knowledge/{$relativePath} ---\n{$content}";
        }
    }

    return implode("\n\n", $chunks);
}

function build_full_system_prompt(): string
{
    $systemPrompt = file_get_contents(SYSTEM_PROMPT_PATH);
    $knowledge = load_knowledge_base(KNOWLEDGE_DIR);

    return $systemPrompt . "\n\n# BASE DE CONNAISSANCES\n\n" . $knowledge;
}
