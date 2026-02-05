import fs from "fs";
import { execSync } from "child_process";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function run() {
  console.log("🤖 Agent startet...");

  // 1️⃣ Minimaler Claude-Test (headless, API)
  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: "Antworte nur mit dem Wort OK.",
      },
    ],
  });

  console.log("🧠 Claude Response:", response.content[0].text);

  // 2️⃣ Datei schreiben (bewusst geändert)
  fs.writeFileSync(
    "agent_test.txt",
    "✅ Update vom Server-Agent – Commit & Deploy Pipeline aktiv.\n"
  );

  console.log("✅ Datei agent_test.txt erstellt");

  // 3️⃣ Git Commit & Push (kontrolliert)
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "Agent update: file change"', {
    stdio: "inherit",
  });
  execSync("git push", { stdio: "inherit" });

  console.log("🚀 Commit & Push abgeschlossen");
  console.log("🏁 Agent fertig");
}

run().catch(console.error);

