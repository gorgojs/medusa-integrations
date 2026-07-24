import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import {
  Classifier,
  ClassifierProperty,
  Offer,
  OffersPackage,
  Warehouse,
} from "commerceml-parser-core";
import { createReadStream } from "fs";
import { ParseFileStepInput } from "../../types";
import { Logger } from "@medusajs/framework/types";
import { BitrixCommerceMlOffersParser } from "../../utils/parsing/bitrix-offers-parser";

export const parseOffersFilesStep = createStep(
  "parse-offer-files",
  async (filePaths: ParseFileStepInput, { container }) => {
    const logger = container.resolve<Logger>("logger");
    const offerParser = new BitrixCommerceMlOffersParser();

    let classifier: Classifier | undefined;
    let properties: ClassifierProperty[] = [];
    let offersPackage: OffersPackage = {} as OffersPackage;
    const offers: Offer[] = [];
    const warehouses: Warehouse[] = [];

    offerParser.onClassifier((cl) => {
      classifier = cl;
    });
    offerParser.onClassifierProperty((cp) => {
      properties.push(cp);
    });
    offerParser.onOffersPackage((cg) => {
      offersPackage = cg;
    });
    offerParser.onOffer((cp) => {
      offers.push(cp);
    });
    offerParser.onWarehouse((cg) => {
      warehouses.push(cg);
    });

    try {
      if (filePaths) {
        logger.info(
          `[1C Integration] Parsing import files: ${filePaths.join(", ")}`
        );
        await Promise.all(
          filePaths.map((filePath) =>
            offerParser.parse(createReadStream(filePath))
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

    return new StepResponse({
      classifier,
      properties,
      offersPackage,
      offers,
      warehouses,
    });
  }
);
