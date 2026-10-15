import { analyze } from "../src/lib/scanner";
import { SAMPLE_ENV } from "../src/lib/sample";

const sample = `${SAMPLE_ENV}\nSOME_HASH=aB3kL9mN2pQ7rS1tU5vW8xY4zA6cD0eF\n`;

async function main() {
const result = await analyze({ mode: "paste", filename: ".env", code: sample });

console.log("filesScanned:", result.filesScanned);
console.log("groqUsed:", result.groqUsed);
console.log("issue count:", result.issues.length);
console.log("---");
for (const issue of result.issues) {
  console.log(
    `${issue.severity.padEnd(8)} ${issue.type.padEnd(28)} line=${String(issue.line).padEnd(3)} ${issue.matchMasked}`,
  );
}

// Assertions
const types = new Set(result.issues.map((i) => i.type));
const checks: [string, boolean][] = [
  ["AWS access key id detected", [...types].some((t) => t.includes("AWS Access Key"))],
  ["GitHub token detected", [...types].some((t) => t.includes("GitHub"))],
  ["Stripe key detected", [...types].some((t) => t.includes("Stripe"))],
  ["Committed .env detected", types.has("Committed .env File")],
  ["No raw secret leaked in masked output", result.issues.every((i) => !i.matchMasked.includes("wJalrXUtnFEMI"))],
];

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
}

main();
