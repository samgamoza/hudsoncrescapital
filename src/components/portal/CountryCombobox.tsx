import { useEffect, useId, useMemo, useState } from "react";
import { COUNTRIES, getCountry } from "@/lib/countries";

type Props = {
  value: string | null | undefined; // ISO-2
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Country combobox: type the first letters of the country name OR the ISO code
 * (e.g. "US", "Uni", "Germ") and pick from the live filtered list.
 * Selecting a value emits the ISO-2 code.
 */
export function CountryCombobox({
  value,
  onChange,
  className = "",
  disabled,
  placeholder = "Type country…",
}: Props) {
  const id = useId();
  const selected = getCountry(value ?? "");
  const [text, setText] = useState(selected ? selected.name : "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = getCountry(value ?? "");
    setText(c ? c.name : "");
  }, [value]);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 10);
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().startsWith(q) ||
        c.code.toLowerCase().startsWith(q) ||
        c.name.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [text]);

  const commit = (code: string) => {
    const c = getCountry(code);
    if (!c) return;
    onChange(c.code);
    setText(c.name);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          // If exact ISO-2 code typed, auto-commit
          const exact = COUNTRIES.find(
            (c) => c.code.toLowerCase() === e.target.value.trim().toLowerCase(),
          );
          if (exact) commit(exact.code);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) {
            e.preventDefault();
            commit(matches[0].code);
          }
        }}
        className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:border-brand/60"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-background shadow-elevated">
          {matches.map((c) => (
            <button
              key={c.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(c.code)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-elevated flex items-center gap-2"
            >
              <span>{c.flag}</span>
              <span className="text-foreground">{c.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {c.code} · +{c.dial}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
