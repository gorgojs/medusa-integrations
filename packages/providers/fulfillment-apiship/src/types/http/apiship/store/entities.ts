import {
  BaseApishipProvider,
} from "../common"
import {
  CalculatorToDoorResult,
  CalculatorToDoorResultTariffsInner,
  CalculatorToPointResult,
  CalculatorToPointResultAllOfTariffs,
  GetCalculator200Response,
  PointObject,
} from "../../../../lib/apiship-client"

export interface StoreApishipProvider extends BaseApishipProvider {}
export interface StoreApishipPoint extends PointObject {}
export interface StoreApishipCalculation extends GetCalculator200Response {}
export type StoreApishipDoorGroup = CalculatorToDoorResult
export type StoreApishipDoorTariff = CalculatorToDoorResultTariffsInner
export type StoreApishipPointGroup = CalculatorToPointResult
export type StoreApishipPointTariff = CalculatorToPointResultAllOfTariffs
