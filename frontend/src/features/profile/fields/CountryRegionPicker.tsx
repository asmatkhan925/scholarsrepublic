"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function CountryRegionPicker({
  label,
  values,
  countryRegions,
  onChange,
}: {
  label: string;
  values: string[];
  countryRegions: Record<string, readonly string[]>;
  onChange: (value: string[]) => void;
}) {
  const regionNames = Object.keys(countryRegions);
  const [region, setRegion] = useState(regionNames[0] ?? "");
  const [country, setCountry] = useState("");

  const countriesForRegion = region ? (countryRegions[region] ?? []) : [];

  function addCountry() {
    if (!country || values.includes(country)) {
      return;
    }

    onChange([...values, country]);
    setCountry("");
  }

  function removeCountry(countryName: string) {
    onChange(values.filter((item) => item !== countryName));
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-ink/80 dark:text-white/75">{label}</p>

      <div className="grid gap-2 md:grid-cols-[12rem_1fr_auto]">
        <select
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setCountry("");
          }}
          className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
        >
          {regionNames.map((regionName) => (
            <option key={regionName} value={regionName}>
              {regionName}
            </option>
          ))}
        </select>

        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="w-full rounded-xl border border-pine/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10 dark:border-white/10 dark:bg-[#101214] dark:text-white"
        >
          <option value="">Select country</option>
          {countriesForRegion.map((countryName) => (
            <option key={countryName} value={countryName} disabled={values.includes(countryName)}>
              {countryName}
            </option>
          ))}
        </select>

        <Button type="button" onClick={addCountry} disabled={!country} variant="outline">
          Add
        </Button>
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((countryName) => (
            <button
              key={countryName}
              type="button"
              onClick={() => removeCountry(countryName)}
              className="rounded-2xl border border-pine/15 bg-mint px-3 py-1.5 text-sm font-medium text-pine transition hover:bg-saffron/20"
            >
              {countryName} ×
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-ink/45 dark:text-white/45">
          Select a region first, then add countries you are seriously considering.
        </p>
      )}
    </div>
  );
}
