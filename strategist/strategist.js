import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------- INPUT (vorerst statisch, später Telegram/API) ----------
const USER_PROMPT = `
Bitte update die Landingpage für Kunde Müller.
Neue Headline: "Mehr Kunden in 30 Tagen"
Neuer CTA: "Jetzt Beratung sichern"
`;

// ---------- SYSTEM PROMPT (Rolle: Stratege) ----------
const SYSTEM_PROMPT = `
Du bist der Strategen-Agent eines internen AI-Systems.
Deine Aufgabe ist es, aus freiem Text EINEN Task
im folgenden JSON-Schema zu erzeugen.

REGELN:
- Antworte AUSSCHLIESSLICH mit gültigem JSON
- KEIN erklärender Text
- KEINE Markdown
- KEINE zusätzlichen Felder
- Nutze NUR diese Actions:
  - update_file
  - write_changelog
  - deploy_vercel

SCHEMA:
{
  "task_type": "update_existing_project",
  "project": {
    "name": "vercel-demo",
    "path": "vercel-demo"
  },
  "actions": [
    {
      "type": "update_file",
      "file": "index.html",
      "content": "<html>...</html>"
    },
    {
      "type": "write_changelog",
      "file": "docs/changelog.md",
      "entry": "..."
    },
    {
      "type": "deploy_vercel"
    }
  ]
}
`;

async function run() {
  console.log("🧠 Strategen-Agent startet...");

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: USER_PROMPT }],
  });

  const jsonText = response.content[0].text.trim();

  // Safety: JSON validieren
  const task = JSON.parse(jsonText);

  fs.writeFileSync(
    "tasks/current.json",
    JSON.stringify(task, null, 2)
  );

  console.log("📋 Task-Datei tasks/current.json erzeugt");
}

run().catch(console.error);
