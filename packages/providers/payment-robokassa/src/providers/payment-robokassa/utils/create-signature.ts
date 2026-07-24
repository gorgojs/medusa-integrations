import { createHash } from "crypto";
import { HashAlgorithms } from "../types";

export function createSignature(raw: (string | undefined)[], hashAlgorithm: (typeof HashAlgorithms)[number]): string {
  const concatenatedParams = raw.filter(v => v).join(":")
  const res = createHash(hashAlgorithm).update(concatenatedParams).digest('hex')

  return res
}
