import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// --------------------------------------------------
// INPUT (später Telegram / API)
// --------------------------------------------------
const USER_PROMPT = `
Bitte update die Landingpage für Kunde Mueller.
Neue Headline: "Mehr Kunden in 30 Tagen"
Neuer CTA: "Jetzt Beratung sichern"
`;

// --------------------------------------------------
// LOAD CLIENT MEMORY
// --------------------------------------------------
function loadClientMemory(clientName) {
  const basePath = path.join("clients", clientName.toLowerCase());

  const context = JSON.parse(
    fs.readFileSync(path.join(basePath, "context.json"), "utf-8")
  );

  const preferences = JSON.parse(
    fs.readFileSync(path.join(basePath, "preferences.json"), "utf-8")
  );

  const projects = JSON.parse(
    fs.readFileSync(path.join(basePath, "projects.json"), "utf-8")
  );

  return { context, preferences, projects };
}

// --------------------------------------------------
// SYSTEM PROMPT (STRATEGE)
// --------------------------------------------------
function buildSystemPrompt(clientMemory) {
  return `
Du bist der Strategen-Agent eines internen AI-Systems.

KUNDENKONTEXT:
${JSON.stringify(clientMemory.context, null, 2)}

PREFERENZEN:
${JSON.stringify(clientMemory.preferences, null, 2)}

PROJEKTE:
${JSON.stringify(clientMemory.projects, null, 2)}

DEINE AUFGABE:
- Verstehe den Nutzerwunsch
- Nutze den obigen Kontext
- Erzeuge GENAU EINEN Task im folgenden JSON-Schema

REGELN:
- Antworte AUSSCHLIESSLICH mit gültigem JSON
- KEIN erklärender Text
- KEIN Markdown
- KEINE zusätzlichen Felder
- Nutze NUR diese Actions:
  - update_file
  - write_changelog
  - deploy_vercel

SCHEMA:
{
  "task_type": "update_existing_project",
  "project": {
    "name": "string",
    "path": "string"
  },
  "actions": [
    {
      "type": "update_file",
      "file": "index.html",
      "content": "string"
    },
    {
      "type": "write_changelog",
      "file": "docs/changelog.md",
      "entry": "string"
    },
    {
      "type": "deploy_vercel"
    }
  ]
}
`;
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------
async function run() {
  console.log("🧠 Strategen-Agent mit Memory startet...");

  const clientName = "mueller";
  const clientMemory = loadClientMemory(clientName);

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 900,
    system: buildSystemPrompt(clientMemory),
    messages: [{ role: "user", content: USER_PROMPT }],
  });

  const jsonText = response.content[0].text.trim();
  const task = JSON.parse(jsonText);

  fs.writeFileSync(
    "tasks/current.json",
    JSON.stringify(task, null, 2)
  );

  console.log("📋 Task-Datei mit Kundenkontext erzeugt");
}

run().catch(console.error);
