"use client";

import { useEffect, useState } from "react";
import { parseIstLocal } from "../lib/time";
import { predictClaimProbability } from "../lib/predict";

export function ClaimLikelihoodPreview() {
  const [probability, setProbability] = useState<number | null>(null);

  useEffect(() => {
    const host = document.getElementById("claim-likelihood-preview");
    const form = host?.closest("form");
    if (!form) return;

    const update = () => {
      const foodType = form.querySelector<HTMLSelectElement>('select[name="foodType"]')?.value;
      const quantityKg = Number(form.querySelector<HTMLInputElement>('input[name="quantityKg"]')?.value);
      const pickupStartValue = form.querySelector<HTMLInputElement>('input[name="pickupStart"]')?.value;
      const pickupEndValue = form.querySelector<HTMLInputElement>('input[name="pickupEnd"]')?.value;
      if (!foodType || !Number.isFinite(quantityKg) || quantityKg <= 0 || !pickupStartValue || !pickupEndValue) {
        setProbability(null);
        return;
      }

      try {
        setProbability(predictClaimProbability({
          foodType,
          quantityKg,
          pickupStart: parseIstLocal(pickupStartValue),
          pickupEnd: parseIstLocal(pickupEndValue)
        }));
      } catch {
        setProbability(null);
      }
    };

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);

  return (
    <div id="claim-likelihood-preview" className="rounded border bg-slate-50 p-4" aria-live="polite">
      <p className="font-medium">
        Estimated chance of being claimed: {probability === null ? "—" : `${Math.round(probability * 100)}%`}
      </p>
      <p className="text-sm text-slate-600">Estimated by a model trained on synthetic data</p>
    </div>
  );
}
