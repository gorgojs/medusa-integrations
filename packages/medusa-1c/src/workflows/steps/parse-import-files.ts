import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { CommerceMlImportParser } from "commerceml-parser";
import {
  Catalog,
  Classifier,
  ClassifierGroup,
  ClassifierProperty,
  Product,
} from "../../types/commerceml";
import { createReadStream } from "fs";
import { MedusaError } from "@medusajs/utils";
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration";
import { ONEC_INTEGRATION_IDENTIFIER } from "../../providers/integration-1c/services";
import { ParseFileStepInput } from "../../types";
import { Logger } from "@medusajs/framework/types";

export const parseImportFilesStep = createStep(
  "parse-import-files",
  async (filePaths: ParseFileStepInput, { container }) => {
    const logger = container.resolve<Logger>("logger");
    const importParser = new CommerceMlImportParser();

    const catalogs: Catalog[] = [];
    const properties: ClassifierProperty[] = [];
    const products: Product[] = [];
    const classifierGroups: ClassifierGroup[] = [];
    let classifier: Classifier | undefined;

    importParser.onClassifier((cl) => {
      classifier = cl;
    });
    importParser.onClassifierProperty((cp) => {
      properties.push(cp);
    });
    importParser.onClassifierGroup((cg) => {
      classifierGroups.push(cg);
    });
    importParser.onProduct((p) => {
      products.push(p);
    });
    importParser.onCatalog((c) => {
      catalogs.push(c);
    });

    try {
      if (filePaths) {
        logger.info(`[1C Integration] Parsing import file: ${filePaths}`);
        await Promise.all(
          filePaths.map((filePath) =>
            importParser.parse(createReadStream(filePath))
          )
        );
        logger.info(`[1C Integration] Parsed data successfully.`);
      }
    } catch (e) {
      logger.error(
        `[1C Integration] Failed to parse import file: ${(e as Error).message}`
      );
      throw e;
    }

    const integrationService: IntegrationModuleService =
      container.resolve(INTEGRATION_MODULE);
    const resolved = await integrationService.getResolvedOptions(
      ONEC_INTEGRATION_IDENTIFIER
    );
    if (!resolved) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "1C integration is not configured or disabled."
      );
    }

    return new StepResponse({
      classifier,
      properties,
      classifierGroups,
      products,
      settings: resolved.options,
    });
  }
);
