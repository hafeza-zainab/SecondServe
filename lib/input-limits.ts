export const MAX_ENTITY_ID_LENGTH = 64;
export const MAX_QUANTITY_INPUT_LENGTH = 32;
export const MAX_LOCAL_DATETIME_LENGTH = 23;
export const MAX_IDENTITY_RETURN_TO_LENGTH = 512;

export function isValidEntityId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ENTITY_ID_LENGTH;
}
