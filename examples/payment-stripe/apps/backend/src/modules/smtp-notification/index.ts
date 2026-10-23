import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { SmtpNotificationService } from "./services/smtp";

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [SmtpNotificationService],
});
