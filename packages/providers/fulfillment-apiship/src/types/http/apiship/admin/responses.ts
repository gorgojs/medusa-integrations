import { DeleteResponse } from "../../common"
import {
  AdminApishipOptions,
  AdminApishipConnection,
  AdminApishipAccountConnection,
  AdminApishipProvider,
  AdminApishipPoint
} from "./entities"

export interface AdminApishipConnectionResponse {
  /**
   * The ApiShip connection's details.
   */
  connection: AdminApishipConnection
}

export type AdminApishipConnectionListResponse = {
  /**
   * The list of ApiShip connections.
   */
  connections: AdminApishipConnection[]
}

export type AdminApishipConnectionDeleteResponse = DeleteResponse<"connection">

export type AdminApishipAccountConnectionListResponse = {
  /**
   * The list of ApiShip account connections.
   */
  account_connections: AdminApishipAccountConnection[]
}

export type AdminApishipProviderListResponse = {
  /**
   * The list of ApiShip account connections.
   */
  providers: AdminApishipProvider[]
}

export type AdminApishipOptionsResponse = {
  apiship_options: AdminApishipOptions
}

export type AdminApishipPointListResponse = {
  points: AdminApishipPoint[]
}
