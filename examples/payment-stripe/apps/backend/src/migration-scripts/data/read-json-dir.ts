import fs from "node:fs";
import path from "node:path";

const isMissing = (value: unknown, field: string) => {
  let current: unknown = value;
  for (const part of field.split(".")) {
    if (typeof current !== "object" || current === null) return true;
    current = (current as Record<string, unknown>)[part];
  }
  return current === undefined || current === null || current === "";
};

export const readJsonDir = <T>(
  dir: string,
  { label, requiredFields }: { label: string; requiredFields: string[] },
) => {
  const files = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".json"))
        .sort()
    : [];

  if (!files.length) {
    throw new Error(
      `No ${label} found in "${dir}". Migration scripts load data from <cwd>/src, so when seeding from a build output make sure src/**/*.json is copied into it.`,
    );
  }

  return files.map((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as T;

    for (const field of requiredFields) {
      if (isMissing(data, field)) {
        throw new Error(`${label}: "${file}" is missing "${field}".`);
      }
    }

    return { name: path.basename(file, ".json"), data };
  });
};
