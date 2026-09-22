import type { MedusaContainer } from "@medusajs/framework";
import { logger } from "@medusajs/framework/logger";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export const toKey = (value: string) =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join("");

export const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY);

export const getLink = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.LINK);

export const step = async <T>(work: Promise<T>, label: string) => {
  logger.info(`Seeding ${label}...`);
  const result = await work;
  logger.info(`Finished seeding ${label}.`);
  return result;
};
