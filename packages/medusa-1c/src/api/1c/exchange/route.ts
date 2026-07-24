import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import * as fs from "fs/promises";
import * as path from "path";
import { MedusaError, Modules } from "@medusajs/utils";
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration";
import { ONEC_INTEGRATION_IDENTIFIER } from "../../../providers/integration-1c/services";
import {
  decompressAndExtract,
  ensureUploadDir,
} from "../../../utils/exchange-utils";
import { UPLOAD_DIR } from "../../../data/constants";
import {
  AuthenticationInput,
  IAuthModuleService,
} from "@medusajs/framework/types";
import { onecImportWorkflow } from "../../../workflows/onec-import-workflow";
import { onecOffersWorkflow } from "../../../workflows/onec-offers-workflow";

function sendPlainTextResponse(
  res: MedusaResponse,
  statusCode: number,
  content: string
) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(statusCode).send(content);
}

const active1CSessions = new Set<string>();

function getSessionId(req: MedusaRequest): string | undefined {
  return req.cookies["medusa_1c_session_id"];
}

function isAuthValid(req: MedusaRequest) {
  const sessionId = getSessionId(req);
  return sessionId && active1CSessions.has(sessionId);
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger");
  const integrationService: IntegrationModuleService =
    req.scope.resolve(INTEGRATION_MODULE);

  const resolved = await integrationService.getResolvedOptions(
    ONEC_INTEGRATION_IDENTIFIER
  );

  const { type, mode } = req.query as {
    type?: string;
    mode?: string;
    filename?: string;
  };

  if (type === "catalog") {
    const sessionId = getSessionId(req);

    if (mode !== "checkauth") {
      if (!sessionId || !isAuthValid(req)) {
        logger.debug(
          `[1C Integration] ${mode}: Authentication failed (1C session cookie missing or invalid).`
        );
        return sendPlainTextResponse(
          res,
          401,
          `failure\nAuthentication failed for ${mode}`
        );
      }

      if (!resolved) {
        logger.warn(
          `[1C Integration] ${mode}: integration is not configured or disabled.`
        );
        return sendPlainTextResponse(
          res,
          503,
          "failure\n1C integration is not configured or disabled. Configure it in Settings -> Integrations."
        );
      }
    }

    switch (mode) {
      case "checkauth":
        let checkAuthValid = false;

        if (req.headers.authorization) {
          const authModuleService: IAuthModuleService = req.scope.resolve(
            Modules.AUTH
          );

          try {
            const [login, password] = Buffer.from(
              req.headers.authorization.split(" ")[1],
              "base64"
            )
              .toString()
              .split(":");

            if (login && password) {
              const { success, authIdentity, error } =
                await authModuleService.authenticate("emailpass", {
                  body: {
                    email: login,
                    password: password,
                  },
                  authScope: "admin",
                } as AuthenticationInput);

              if (success) {
                checkAuthValid = true;
                logger.debug(
                  `[1C Integration] User '${login}' authenticated successfully.`
                );
              } else if (error) {
                logger.warn(
                  `[1C Integration] User '${login}' authentication failed: ${error}`
                );
                checkAuthValid = false;
              }
            }
          } catch (error: any) {
            logger.debug(
              `[1C Integration] Authentication attempt failed for user: ${error.message}`
            );
            checkAuthValid = false;
          }
        }

        if (!checkAuthValid) {
          logger.debug(
            "[1C Integration] Checkauth: Authentication failed (Invalid credentials or insufficient permissions)."
          );
          return sendPlainTextResponse(
            res,
            401,
            `failure\nAuthentication failed for ${mode}`
          );
        } else {
          const newCookieName = "medusa_1c_session_id";
          const newCookieValue = `sess_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 15)}`;
          active1CSessions.add(newCookieValue);
          logger.debug(
            `[1C Integration] Checkauth: New session ${newCookieName}=${newCookieValue}`
          );
          res.cookie(newCookieName, newCookieValue, {
            httpOnly: true,
            path: "/",
          });
          return sendPlainTextResponse(
            res,
            200,
            `success\n${newCookieName}\n${newCookieValue}`
          );
        }

      case "init":
        logger.debug(`[1C Integration] Init`);
        const sessionDir = path.join(UPLOAD_DIR, sessionId!);
        try {
          await fs.rm(sessionDir, { recursive: true, force: true });
          logger.debug(
            `[1C Integration] Cleaned up session directory: ${sessionDir}`
          );
        } catch (error) {
          logger.error(
            `[1C Integration] Failed to clean up session directory ${sessionDir}: ${error}`
          );
        }

        const zipSupported = resolved!.options.useZip ? "yes" : "no";
        const fileLimit = resolved!.options.chunkSize;
        return sendPlainTextResponse(
          res,
          200,
          `zip=${zipSupported}\nfile_limit=${fileLimit}`
        );

      case "import":
        const importSessionDir = path.join(UPLOAD_DIR, sessionId!);
        logger.debug(
          `[1C Integration] Import: Starting import for session ${sessionId}`
        );
        try {
          let files = await fs.readdir(importSessionDir);

          for (const file of files) {
            if (path.extname(file).toLowerCase() === ".zip") {
              const zipFilePath = path.join(importSessionDir, file);
              logger.debug(`[1C Integration] Decompressing ${zipFilePath}`);
              await decompressAndExtract(zipFilePath, importSessionDir);
              await fs.unlink(zipFilePath);
            }
          }

          files = await fs.readdir(importSessionDir);

          const importFiles = files
            .filter((f) => f.startsWith("import") && f.endsWith(".xml"))
            .map((f) => path.join(importSessionDir, f));

          const offerFiles = files
            .filter((f) => f.startsWith("offers") && f.endsWith(".xml"))
            .map((f) => path.join(importSessionDir, f));

          if (importFiles.length > 0) {
            logger.info(
              "[1C Integration] Found import.xml. Running Import Workflow."
            );
            const { errors } = await onecImportWorkflow(req.scope).run({
              input: { import: importFiles },
              throwOnError: true,
            });
            if (errors?.length > 0) throw errors[0].error;
          } else if (offerFiles.length > 0) {
            logger.info(
              "[1C Integration] Found offers.xml. Running Offers Workflow."
            );
            const { errors } = await onecOffersWorkflow(req.scope).run({
              input: { offers: offerFiles },
              throwOnError: true,
            });
            if (errors?.length > 0) throw errors[0].error;
          } else {
            logger.warn(
              `[1C Integration] Import: No import or offer files found to import for session ${sessionId}`
            );
          }

          logger.debug(
            `[1C Integration] Import step completed for session ${sessionId}`
          );
          return sendPlainTextResponse(res, 200, "success");
        } catch (error: any) {
          logger.error(
            `[1C Integration] Import: Failed for session ${sessionId}: ${error?.message ?? error}`
          );
          return sendPlainTextResponse(res, 500, `failure\n${error?.message}`);
        }

      case "query":
        logger.debug(`[1C Integration] Query: Export not implemented.`);
        return sendPlainTextResponse(
          res,
          200,
          `failure\nExport functionality (query mode) is not implemented yet.`
        );

      case "success":
        logger.debug(
          `[1C Integration] Success: Exchange completed for session ${sessionId}. Cleaning up.`
        );
        const successSessionDir = path.join(UPLOAD_DIR, sessionId!);
        try {
          await fs.rm(successSessionDir, {
            recursive: true,
            force: true,
          });
          active1CSessions.delete(sessionId!);
          logger.debug(
            `[1C Integration] Cleaned up session directory and session data for ${sessionId}.`
          );
        } catch (error) {
          logger.error(
            `[1C Integration] Failed to clean up session directory ${successSessionDir}: ${error}`
          );
        }
        return sendPlainTextResponse(res, 200, "success");

      default:
        return sendPlainTextResponse(
          res,
          400,
          "failure\nInvalid mode parameter for GET request"
        );
    }
  }

  return sendPlainTextResponse(res, 400, "failure\nInvalid type parameter");
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve("logger");

  const { type, mode, filename } = req.query as {
    type?: string;
    mode?: string;
    filename?: string;
  };

  const sessionId = getSessionId(req);
  if (!sessionId || !isAuthValid(req)) {
    logger.debug(
      "[1C Integration] File Upload (POST): Authentication failed (1C session cookie missing or invalid)."
    );
    return sendPlainTextResponse(
      res,
      401,
      "failure\nAuthentication failed for file upload"
    );
  }

  if (type !== "catalog" || mode !== "file" || !filename) {
    return sendPlainTextResponse(
      res,
      400,
      "failure\nInvalid parameters for POST request"
    );
  }

  logger.debug(
    `[1C Integration] File Upload: Receiving chunk for file: ${filename} for session ${sessionId}`
  );

  const body = req.body as Buffer;
  if (!body || body.length === 0) {
    logger.debug(
      `[1C Integration] File Upload: No file content for ${filename}.`
    );
    return sendPlainTextResponse(
      res,
      400,
      `failure\nNo file content received for ${filename}.`
    );
  }

  await ensureUploadDir();
  const sessionDir = path.join(UPLOAD_DIR, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  try {
    const filePath = path.join(sessionDir, filename);
    await fs.appendFile(filePath, body);
    logger.debug(`[1C Integration] File Upload: Saved chunk to ${filePath}`);
    return sendPlainTextResponse(res, 200, "success");
  } catch (error) {
    logger.error(
      `[1C Integration] File upload error for ${filename}: ${error}`
    );
    const errorMessage =
      error instanceof MedusaError
        ? error.message
        : error instanceof Error
        ? error.message
        : "Unknown file upload error";
    return sendPlainTextResponse(res, 500, `failure\n${errorMessage}`);
  }
}
