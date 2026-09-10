import {
  BaseApishipOptions,
  BaseApishipConnection,
  BaseApishipAccountConnection,
  BaseCostDeliveryCostVatEnum,
  BaseApishipProvider,
} from "../common"

import { PointObject, TariffObject } from "../../../../lib/apiship-client"

export interface AdminApishipConnection extends BaseApishipConnection { }
export interface AdminApishipAccountConnection extends BaseApishipAccountConnection { }
export interface AdminApishipProvider extends BaseApishipProvider { }
export interface AdminApishipOptions extends BaseApishipOptions { }
export interface AdminApishipPoint extends PointObject {}
export interface AdminApishipTariff extends TariffObject {}
export type AdminCostDeliveryCostVatEnum = BaseCostDeliveryCostVatEnum
