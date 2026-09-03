/**
 * Compile le prompt système + toute la base de connaissances (knowledge/*.md)
 * en un seul module JavaScript (lib/generated-prompt.js), pour garantir que
 * ce contenu soit inclus dans le build Vercel (les lectures de fichiers
 * dynamiques à l'exécution ne sont pas fiables dans les fonctions serverless).
 *
 * Ce script tourne automatiquement avant chaque build (voir "prebuild" dans
 * package.json), donc si tu modifies un fichier .md, il suffit de relancer
 * le build (ou de re-déployer sur Vercel) pour que le changement soit pris
 * en compte.
 */

const fs = require("fs");
const path = require("path");

const AGENT_DATA_DIR = path.join(__dirname, "..", "agent-data");
const SYSTEM_PROMPT_PATH = path.join(AGENT_DATA_DIR, "system-prompt.md");
const KNOWLEDGE_DIR = path.join(AGENT_DATA_DIR, "knowledge");
const OUTPUT_PATH = path.join(__dirname, "..", "lib", "generated-prompt.js");

function walkMarkdownFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  const files = walkMarkdownFiles(KNOWLEDGE_DIR);
  const chunks = files.map((filePath) => {
    const relative = path.relative(KNOWLEDGE_DIR, filePath).split(path.sep).join("/");
    const content = fs.readFileSync(filePath, "utf8");
    return `--- CONTENU: knowledge/${relative} ---\n${content}`;
  });
  const knowledge = chunks.join("\n\n");
  const fullPrompt = `${systemPrompt}\n\n# BASE DE CONNAISSANCES\n\n${knowledge}`;

  const libDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });

  const fileContent =
    "// Fichier généré automatiquement par scripts/build-knowledge.js — ne pas éditer à la main.\n" +
    "// Pour changer le contenu, modifie les fichiers dans agent-data/ puis relance le build.\n" +
    "export const SYSTEM_PROMPT = " + JSON.stringify(fullPrompt) + ";\n";

  fs.writeFileSync(OUTPUT_PATH, fileContent, "utf8");
  console.log(`✅ Prompt système + base de connaissances compilés (${files.length} fichiers .md inclus).`);
}

main();
