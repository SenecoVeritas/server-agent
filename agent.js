import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TASK = `
Erstelle eine Datei namens "agent_test.txt"
mit dem Inhalt:
"Der Server-Agent funktioniert."
`;

async function run() {
  console.log("🤖 Agent startet...");

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: TASK,
      },
    ],
  });

  console.log("🧠 Claude Response erhalten.");

  fs.writeFileSync(
    "agent_test.txt",
    "Der Server-Agent funktioniert.\n"
  );

  console.log("✅ Datei agent_test.txt erstellt");
  console.log("🏁 Agent fertig");
}

run().catch(console.error);
