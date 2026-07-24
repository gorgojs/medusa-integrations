import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { gunzip } from "zlib"
import { promisify } from "util"

const FILE_EXTENSION = ".xml"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id, fileName } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const fileModuleService = req.scope.resolve(Modules.FILE)

    const { data } = await query.graph({
      entity: "feed",
      filters: { id },
      fields: ["file_path", "file_name"],
    })

    const feed = data?.[0]

    if (!feed) {
      return res.status(404).json({ message: "Feed not found" })
    }

    const { file_path: filePath, file_name: expectedFileName } = feed

    if (!filePath || !expectedFileName) {
      return res.status(404).json({ message: "Feed file info missing" })
    }

    const expectedFileNameWithExt = expectedFileName + FILE_EXTENSION
    if (expectedFileNameWithExt !== fileName) {
      return res.status(404).json({ message: "File name does not match" })
    }

    let fileId: string
    try {
      const url = new URL(filePath)
      fileId = url.pathname.split("/").pop()!
    } catch {
      return res.status(400).json({ message: "Invalid file path format" })
    }
    const encoded = decodeURIComponent(fileId)
    const base64Buffer = await fileModuleService.getAsBuffer(encoded)
    const gunzipAsync = promisify(gunzip)
    const xmlBuffer = await gunzipAsync(base64Buffer)
  
    res.setHeader("Content-Type", "application/xml")
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`)
    res.send(xmlBuffer)

  } catch (err) {
    return res.status(500).json({ message: "Internal server error" })
  }
}
