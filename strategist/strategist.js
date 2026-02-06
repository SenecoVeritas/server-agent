import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ==================================================
// INPUT
// ==================================================
const USER_PROMPT = process.argv.slice(2).join(" ").trim();

if (!USER_PROMPT) {
  console.error("❌ Kein Prompt übergeben.");
  process.exit(1);
}

// ==================================================
// CLIENT HELPERS
// ==================================================
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function listClients() {
  if (!fs.existsSync("clients")) return [];
  return fs
    .readdirSync("clients")
    .filter((name) =>
      fs.statSync(path.join("clients", name)).isDirectory()
    );
}

function detectClientFromPrompt(prompt, clients) {
  const p = normalize(prompt);
  return clients.find((c) => p.includes(normalize(c)));
}

// ==================================================
// CLIENT MEMORY
// ==================================================
function loadClientMemory(client) {
  const base = path.join("clients", client);

  const safeRead = (file, fallback) => {
    const full = path.join(base, file);
    return fs.existsSync(full)
      ? fs.readFileSync(full, "utf-8")
      : fallback;
  };

  return {
    context: safeRead("context.json", "{}"),
    preferences: safeRead("preferences.json", "{}"),
    projects: safeRead("projects.json", "[]"),
    history: safeRead("history.md", ""),
  };
}

// ==================================================
// INTENT DETECTION (PHASE 3)
// ==================================================
async function detectIntent(prompt) {
  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 200,
    system:
      "You are an intent classifier for a developer automation system.\n" +
      "Classify the user intent strictly.\n\n" +
      "Allowed intents:\n" +
      "- CREATE_PROJECT\n" +
      "- UPDATE_PROJECT\n" +
      "- UNCLEAR\n\n" +
      "Rules:\n" +
      "- If the user mentions an existing project change, choose UPDATE_PROJECT.\n" +
      "- If the user mentions a file name and a concrete change, choose UPDATE_PROJECT.\n" +
      "- Choose UNCLEAR only if it is genuinely unclear what should be changed or created.\n\n" +
      "Respond ONLY with valid JSON:\n" +
      "{\n" +
      '  "intent": "CREATE_PROJECT | UPDATE_PROJECT | UNCLEAR",\n' +
      '  "reason": "short explanation",\n' +
      '  "follow_up_question": "string or null"\n' +
      "}",
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.content[0].text.trim());
}

// ==================================================
// SYSTEM PROMPT FOR TASK BUILDING
// ==================================================
function buildSystemPrompt(memory) {
  return (
    "You are a strategist agent that creates execution tasks.\n\n" +
    "CLIENT CONTEXT:\n" +
    memory.context +
    "\n\nPREFERENCES:\n" +
    memory.preferences +
    "\n\nPROJECTS:\n" +
    memory.projects +
    "\n\nHISTORY:\n" +
    memory.history +
    "\n\nRULES:\n" +
    "- Output ONLY valid JSON\n" +
    "- Always include an actions array\n" +
    "- Allowed actions:\n" +
    "  - create_project\n" +
    "  - update_file\n" +
    "  - write_changelog\n" +
    "  - deploy_vercel\n" +
    "- update_file requires: file, content\n" +
    "- create_project requires: name, path, template\n" +
    "- Template allowed: landingpage-basic\n\n" +
    "JSON FORMAT:\n" +
    "{\n" +
    '  "task_type": "create_project | update_existing_project",\n' +
    '  "project": { "name": "...", "path": "...", "template": "landingpage-basic" },\n' +
    '  "actions": [ { "type": "update_file", "file": "...", "content": "..." } ]\n' +
    "}"
  );
}

// ==================================================
// MAIN (PHASE 3 GATEKEEPER)
// ==================================================
async function run() {
  console.log("🧠 Strategist gestartet");

  // 1. Intent
  const intentResult = await detectIntent(USER_PROMPT);
  console.log("🧭 Intent:", intentResult.intent);

  if (intentResult.intent === "UNCLEAR") {
    console.log("❓ Rückfrage:");
    console.log(
      intentResult.follow_up_question ||
        "Bitte präzisiere deine Anfrage."
    );
    return;
  }

  // 2. Client
  const clients = listClients();
  const client = detectClientFromPrompt(USER_PROMPT, clients);

  if (!client) {
    throw new Error("❌ Kein Kunde im Prompt erkannt.");
  }

  console.log("📂 Kunde:", client);

  // 3. Memory
  const memory = loadClientMemory(client);

  // 4. Task bauen
  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1000,
    system: buildSystemPrompt(memory),
    messages: [{ role: "user", content: USER_PROMPT }],
  });

  const task = JSON.parse(response.content[0].text.trim());

  fs.writeFileSync("tasks/current.json", JSON.stringify(task, null, 2));
  console.log("📋 Task-Datei erzeugt");
}

run().catch((err) => {
  console.error("❌ Strategist Fehler:");
  console.error(err.message);
});
