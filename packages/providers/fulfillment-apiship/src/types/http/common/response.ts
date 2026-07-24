export type DeleteResponse<TObject extends string> = {
  /**
   * The ID of the item that was deleted.
   */
  id: string

  /**
   * The type of the item that was deleted.
   */
  object: TObject

  /**
   * Whether the item was deleted successfully.
   */
  deleted: boolean
}