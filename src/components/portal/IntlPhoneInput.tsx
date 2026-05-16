import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, getCountry, isValidE164 } from "@/lib/countries";
import { CountryCombobox } from "./CountryCombobox";

type Props = {
  value: string; // E.164 string, e.g. "+14155552671"
  onChange: (next: string) => void;
  /** Controlled country (ISO-2). When provided, dial code follows this country. */
  country?: string | null;
  /** Used only when `value` is empty AND `country` is not provided. */
  defaultCountry?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Narrower country selector for compact signup layouts. */
  dense?: boolean;
};

/**
 * International phone input with typeable country search.
 * - Country combobox: type first letters of country name OR ISO code.
 * - When the parent passes `country`, the dial code stays in sync with it.
 * - Number input accepts digits only; `onChange` always emits E.164 ("+<dial><number>") or "".
 */
export function IntlPhoneInput({
  value,
  onChange,
  country,
  defaultCountry = "US",
  className = "",
  disabled,
  placeholder = "Phone number",
  dense = false,
}: Props) {
  const inferred = useMemo(() => {
    const v = (value ?? "").trim();
    if (v.startsWith("+")) {
      const digits = v.slice(1).replace(/\D/g, "");
      for (const len of [3, 2, 1]) {
        const dial = digits.slice(0, len);
        const m = COUNTRIES.find((c) => c.dial === dial);
        if (m) return { code: m.code, national: digits.slice(len) };
      }
    }
    return { code: defaultCountry.toUpperCase(), national: "" };
  }, [value, defaultCountry]);

  const [iso, setIso] = useState<string>(country ?? inferred.code);
  const [national, setNational] = useState<string>(inferred.national);

  // Keep local national in sync with external value
  useEffect(() => {
    setNational(inferred.national);
  }, [inferred.national]);

  // If parent supplies country, sync iso AND re-emit phone with new dial code.
  useEffect(() => {
    if (!country) return;
    const c = getCountry(country);
    if (!c || c.code === iso) return;
    setIso(c.code);
    if (national) onChange(`+${c.dial}${national}`);
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = getCountry(iso) ?? COUNTRIES[0];
  const valid = !value || isValidE164(value);

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className={dense ? "w-[7.25rem] shrink-0" : "w-[180px]"}>
        <CountryCombobox
          value={iso}
          onChange={(c) => {
            setIso(c);
            const dial = getCountry(c)?.dial;
            if (dial) onChange(national ? `+${dial}${national}` : "");
          }}
          placeholder="Country"
          disabled={disabled}
        />
      </div>
      <input
        type="tel"
        inputMode="tel"
        disabled={disabled}
        placeholder={placeholder}
        value={national}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          setNational(digits);
          onChange(digits ? `+${cur.dial}${digits}` : "");
        }}
        className={`min-w-0 flex-1 bg-surface border ${valid ? "border-border" : "border-destructive/60"} rounded-md ${dense ? "px-2.5 py-1.5" : "px-3 py-2"} text-sm text-foreground focus:outline-none focus:border-brand/60`}
        aria-invalid={!valid}
      />
    </div>
  );
}

type CountryProps = {
  value: string | null | undefined;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
  includeBlank?: boolean;
};

/** Typeable country selector. `includeBlank` is accepted for API compatibility. */
export function CountrySelect({ value, onChange, className = "", disabled }: CountryProps) {
  return (
    <CountryCombobox
      value={value}
      onChange={onChange}
      className={className}
      disabled={disabled}
      placeholder="Type country…"
    />
  );
}
