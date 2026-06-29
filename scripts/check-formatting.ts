import fs from "fs";
import path from "path";

// Unsafe patterns to detect
const UNSAFE_PATTERNS = [
  { regex: /<script\b[^>]*>/i, name: "Script tags" },
  { regex: /<iframe\b[^>]*>/i, name: "Iframe tags" },
  { regex: /<style\b[^>]*>/i, name: "Style tags" },
  { regex: /\bon\w+\s*=/i, name: "Inline event handlers (e.g., onclick, onload)" },
  { regex: /javascript\s*:/i, name: "Javascript pseudo-protocol links" }
];

function getFilesRecursively(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    // Ignore node_modules, build directories, and dotfolders
    if (file === "node_modules" || file === ".next" || file === ".git" || file === ".gemini" || file === ".agents") {
      continue;
    }
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

function checkFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, "utf-8");
  let isCompliant = true;

  console.log(`Checking ${path.relative(process.cwd(), filePath)}...`);

  for (const pattern of UNSAFE_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches) {
      console.error(`❌ Non-compliant formatting detected in ${path.relative(process.cwd(), filePath)}: Found ${pattern.name}`);
      // Find approximate line numbers for convenience
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.regex.test(line)) {
          console.error(`   Line ${index + 1}: ${line.trim().substring(0, 100)}...`);
        }
      });
      isCompliant = false;
    }
  }

  return isCompliant;
}

function main() {
  console.log("🔍 Running Formatting & Security Compliance checks...");
  
  // Find all .md and .mdx files
  const mdFiles = getFilesRecursively(process.cwd(), [".md", ".mdx"]);
  
  // Add specific files like db/seed-db.ts
  const filesToCheck = [...mdFiles];
  const seedDbPath = path.resolve("db/seed-db.ts");
  if (fs.existsSync(seedDbPath)) {
    filesToCheck.push(seedDbPath);
  }

  let allCompliant = true;
  for (const file of filesToCheck) {
    const result = checkFile(file);
    if (!result) {
      allCompliant = false;
    }
  }

  if (allCompliant) {
    console.log("✅ All checked files are compliant with standard formatting rules (no unsafe tags, scripts, or handlers).");
    process.exit(0);
  } else {
    console.error("❌ Formatting checks failed. Please resolve the unsafe elements above.");
    process.exit(1);
  }
}

main();
