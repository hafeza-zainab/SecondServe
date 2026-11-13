"use client";

function istLocalInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function FillExampleButton() {
  function fillExample() {
    const form = document.getElementById("donate-listing-form");
    if (!(form instanceof HTMLFormElement)) return;

    const now = Date.now();
    const values: Record<string, string> = {
      title: "Fresh vegetable lunch bowls (sample)",
      foodType: "Cooked meals",
      quantityKg: "18",
      pickupStart: istLocalInputValue(new Date(now + 60 * 60 * 1000)),
      pickupEnd: istLocalInputValue(new Date(now + 4 * 60 * 60 * 1000)),
      locationText: "Greenfield Canteen, Main Street"
    };

    for (const [name, value] of Object.entries(values)) {
      const control = form.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        control.value = value;
        control.dispatchEvent(new Event("input", { bubbles: true }));
        control.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  return (
    <button
      type="button"
      onClick={fillExample}
      className="button-secondary"
    >
      Fill example
    </button>
  );
}
