import * as syncFs from "fs";
import * as fs from "fs/promises";
import * as unzipper from "unzipper";
import path from "path";
import { MedusaError } from "@medusajs/framework/utils";
import { UPLOAD_DIR } from "../data/constants";

export async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error(
      `[1C Integration] Failed to create upload directory: ${UPLOAD_DIR}`,
      error,
    );
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to create upload directory for 1C exchange.",
    );
  }
}

export async function decompressAndExtract(
  zipFilePath: string,
  outputDir: string,
): Promise<void> {
  const stream = syncFs
    .createReadStream(zipFilePath)
    .pipe(unzipper.Parse({ forceStream: true }));
  for await (const entry of stream) {
    const filePath = path.join(outputDir, entry.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    entry.pipe(syncFs.createWriteStream(filePath));
  }
}
