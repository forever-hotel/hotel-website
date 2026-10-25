import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "README.md",
  "frontend/README.md",
  "documents/release/setup.md",
  "documents/release/api.md",
  "documents/release/traceability.md",
  "documents/release/demo.md",
];
const failures = [];
let links = 0;
for (const file of files) {
  const content = await readFile(resolve(root, file), "utf8");
  for (const match of content.matchAll(/\[[^\]\n]+\]\(([^\s)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = decodeURIComponent(target.split("#")[0]);
    try {
      await access(resolve(root, dirname(file), path));
      links++;
    } catch {
      failures.push(`${file}: missing ${target}`);
    }
  }
}
const matrix = await readFile(
  resolve(root, "documents/release/traceability.md"),
  "utf8",
);
for (let number = 1; number <= 17; number++) {
  const id = `HW-${String(number).padStart(2, "0")}`;
  const rows = matrix
    .split("\n")
    .filter((line) => new RegExp(`^\\|\\s+${id}(?:\\s|\\|)`).test(line));
  if (rows.length !== 1 || !rows[0].includes("]("))
    failures.push(`${id}: require one linked evidence/gap row`);
}
for (const screen of [
  "Home",
  "Rooms",
  "Services",
  "Contact",
  "Offers",
  "Sign In",
  "Sign Up",
  "Profile",
  "Booking screen 1",
  "Booking screen 2",
  "Booking screen 3",
  "Booking screen 4",
]) {
  if (
    !matrix
      .split("\n")
      .some((line) => line.startsWith(`| ${screen} `) && line.includes("]("))
  )
    failures.push(`${screen}: missing linked screen evidence`);
}
for (const [directory, commands] of [
  [
    "backend",
    [
      "build",
      "lint",
      "format:check",
      "test:contracts",
      "test:security",
      "test:integration",
    ],
  ],
  [
    "frontend",
    [
      "build",
      "lint",
      "format:check",
      "typecheck",
      "test",
      "test:coverage",
      "test:e2e",
      "test:quality",
    ],
  ],
  ["performance", ["test", "test:coverage"]],
  ["deploy/staging", ["test", "test:coverage"]],
]) {
  const pkg = JSON.parse(
    await readFile(resolve(root, directory, "package.json"), "utf8"),
  );
  for (const command of commands)
    if (!pkg.scripts?.[command])
      failures.push(`${directory}: missing script ${command}`);
}
const example = await readFile(resolve(root, "backend/.env.example"), "utf8");
const keys = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(
  (match) => match[1],
);
if (new Set(keys).size !== keys.length)
  failures.push("Duplicate backend example environment keys");
if (!keys.includes("BOOKING_PRICING_POLICY"))
  failures.push("Missing pricing policy example");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Release docs verified: ${links} local links, 17 requirements, 12 screens and package scripts. External URLs, live setup and approval are not verified.`,
  );
}
