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

// Directories or files to check
const FILES_TO_CHECK = [
  "db/seed-db.ts",
  "README.md"
];

function checkFile(filePath: string): boolean {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(`⚠️ Warning: File not found at ${filePath}`);
    return true; // Skip non-existent files
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  let isCompliant = true;

  console.log(`Checking ${filePath}...`);

  for (const pattern of UNSAFE_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches) {
      console.error(`❌ Non-compliant formatting detected in ${filePath}: Found ${pattern.name}`);
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
  let allCompliant = true;

  for (const file of FILES_TO_CHECK) {
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
