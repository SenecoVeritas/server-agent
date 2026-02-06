import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// --------------------------------------------------
// CONFIG
// --------------------------------------------------
const TASK_FILE = "tasks/current.json";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function loadTask() {
  return JSON.parse(fs.readFileSync(TASK_FILE, "utf-8"));
}

function createProject(project) {
  const { name, path: projectPath, template } = project;

  if (fs.existsSync(projectPath)) {
    throw new Error(`❌ Projekt existiert bereits: ${projectPath}`);
  }

  const templatePath = path.join("templates", template);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`❌ Template nicht gefunden: ${template}`);
  }

  fs.mkdirSync(projectPath, { recursive: true });
  execSync(`cp -r ${templatePath}/* ${projectPath}`);

  console.log(`📁 Projekt erstellt: ${name}`);
}

function updateFile(projectPath, file, content) {
  const fullPath = path.join(projectPath, file);
  fs.writeFileSync(fullPath, content);
  console.log(`✏️ Datei aktualisiert: ${fullPath}`);
}

function writeChangelog(file, entry) {
  const date = new Date().toISOString().split("T")[0];
  fs.appendFileSync(file, `\n## ${date}\n- ${entry}\n`);
  console.log(`🧾 Changelog ergänzt`);
}

function deployVercel() {
  console.log("🚀 Deploy via Vercel (Git Push)");
}

function gitCommitAndPush() {
  execSync("git add .", { stdio: "inherit" });
  execSync('git commit -m "Agent task execution"', { stdio: "inherit" });
  execSync("git push", { stdio: "inherit" });
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------
function run() {
  console.log("🤖 Agent startet...");

  const task = loadTask();

  for (const action of task.actions) {
    switch (action.type) {
      case "create_project":
        createProject(task.project);
        break;

      case "update_file":
        updateFile(task.project.path, action.file, action.content);
        break;

      case "write_changelog":
        writeChangelog(action.file, action.entry);
        break;

      case "deploy_vercel":
        deployVercel();
        break;

      default:
        throw new Error(`❌ Unbekannte Action: ${action.type}`);
    }
  }

  gitCommitAndPush();
  console.log("🏁 Agent fertig");
}

run();
