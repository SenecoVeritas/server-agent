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
Bitte update die Landingpage für Müller.
Neue Headline: "Mehr Kunden in 30 Tagen"
Neuer CTA: "Jetzt Beratung sichern"
`;

// --------------------------------------------------
// CLIENT DISCOVERY
// --------------------------------------------------
function listClients() {
  return fs.readdirSync("clients").filter((name) =>
    fs.statSync(path.join("clients", name)).isDirectory()
  );
}

function detectClientFromPrompt(prompt, clients) {
  const lower = prompt.toLowerCase();
  return clients.find((client) => lower.includes(client));
}

// --------------------------------------------------
// LOAD CLIENT MEMORY
// --------------------------------------------------
function loadClientMemory(clientName) {
  const basePath = path.join("clients", clientName);

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
// SYSTEM PROMPT
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

AUFGABE:
Erzeuge GENAU EINEN Task im bekannten JSON-Schema.

REGELN:
- Antworte NUR mit validem JSON
- KEIN Text außerhalb des JSON
- KEINE zusätzlichen Felder
- Nutze NUR diese Actions:
  - update_file
  - write_changelog
  - deploy_vercel
`;
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------
async function run() {
  console.log("🧠 Strategen-Agent (Auto-Client) startet...");

  const clients = listClients();
  const clientName = detectClientFromPrompt(USER_PROMPT, clients);

  if (!clientName) {
    throw new Error("❌ Kein Kunde im Prompt erkannt.");
  }

  console.log(`📂 Erkannter Kunde: ${clientName}`);

  const clientMemory = loadClientMemory(clientName);

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 900,
    system: buildSystemPrompt(clientMemory),
    messages: [{ role: "user", content: USER_PROMPT }],
  });

  const task = JSON.parse(response.content[0].text.trim());

  fs.writeFileSync("tasks/current.json", JSON.stringify(task, null, 2));

  console.log("📋 Task-Datei mit automatisch erkanntem Kunden erzeugt");
}

run().catch(console.error);
