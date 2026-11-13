const preservedFieldLimits = {
  title: 81,
  foodType: 64,
  quantityKg: 33,
  pickupStart: 24,
  pickupEnd: 24,
  locationText: 121
} as const;

export type DonateFormValues = {
  title?: string;
  foodType?: string;
  quantityKg?: string;
  pickupStart?: string;
  pickupEnd?: string;
  locationText?: string;
};

export function donateValidationDestination(
  errorCode: string,
  values: DonateFormValues
): string {
  const params = new URLSearchParams({ error: errorCode });

  for (const [field, limit] of Object.entries(preservedFieldLimits)) {
    const value = values[field as keyof DonateFormValues];
    if (value) params.set(field, value.slice(0, limit));
  }

  return `/donate?${params.toString()}`;
}
