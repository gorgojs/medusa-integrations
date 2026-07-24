import {
  StoreApishipCalculation,
  StoreApishipPoint,
  StoreApishipProvider,
} from "./entities"

export type StoreApishipProviderListResponse = {
  providers: StoreApishipProvider[]
}

export type StoreApishipPointListResponse = {
  points: StoreApishipPoint[]
}

export type StoreApishipCalculationResponse = {
  calculation: StoreApishipCalculation
}

export type StoreApishipCalculateResponse = StoreApishipCalculationResponse
