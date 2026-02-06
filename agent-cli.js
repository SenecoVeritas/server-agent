import { execSync } from "child_process";
import fs from "fs";

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.error("❌ Bitte gib einen Prompt an.");
  process.exit(1);
}

console.log("🗣️ Prompt:", prompt);

// 1. Strategen-Agent ausführen
execSync(`node strategist/strategist.js "${prompt}"`, {
  stdio: "inherit",
});

// 2. NUR ausführen, wenn ein Task existiert
if (!fs.existsSync("tasks/current.json")) {
  console.log("🛑 Kein Task erzeugt – Execution wird übersprungen.");
  process.exit(0);
}

// 3. Executor ausführen
execSync("node agent.js", {
  stdio: "inherit",
});

console.log("✅ Execution abgeschlossen");
