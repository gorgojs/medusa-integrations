import FeedModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const FEED_MODULE = "feed"

export default Module(FEED_MODULE, {
  service: FeedModuleService
})