import { useState } from "react";
import { crossOceanLegacyFieldClass as fieldClass, crossOceanLegacyLabelClass as labelClass } from "@/lib/crossOceanLegacyUi";
import {
  ACCOUNT_TYPES,
  EXP_YEARS,
  GBP_INCOME,
  GBP_NET,
  ID_TYPES,
  KNOWLEDGE,
  MARGINAL,
  SALES_REPS,
  SOURCE_ASSETS,
  SOURCE_INCOME,
  TRADES_MONTH,
} from "@/lib/accountOpeningConstants";

const req = (text: string) => (
  <span>
    <span className="text-red-600">*</span>
    {text}
  </span>
);

function DashedRule() {
  return <div className="my-3 border-t border-dashed border-neutral-300" aria-hidden />;
}

/** Legacy reference layout for account-profile field groups (internal QA). */
export function CrossOceanStyleAccountProfilePage() {
  const [accountType, setAccountType] = useState("Individual");
  const [salesRep, setSalesRep] = useState("Adam Christian Drake");
  const [ukCitizen, setUkCitizen] = useState<"uk" | "non">("uk");
  const [filing, setFiling] = useState<"single" | "married">("single");

  return (
    <div className="min-h-screen bg-neutral-200 text-neutral-900">
      <main className="mx-auto max-w-6xl bg-white px-3 py-4 shadow sm:px-6 sm:py-6">
        <p className="mb-3 text-xs text-neutral-600">
          Reference field layout only (not production chrome). Live investor self-registration is at
          /portal/signup/investor; staff desk onboarding uses Admin → Open New Client Account.
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold text-neutral-900">Account Profile</h1>
          <button
            type="button"
            className="rounded border border-blue-800 bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-800"
          >
            Update
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>{req("Select type of account:")}</label>
            <select className={fieldClass} value={accountType} onChange={(e) => setAccountType(e.target.value)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{req("Sales Rep:")}</label>
            <select className={fieldClass} value={salesRep} onChange={(e) => setSalesRep(e.target.value)}>
              {SALES_REPS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Individual */}
          <section className="border border-neutral-300 bg-neutral-50/50 p-3 sm:p-4">
            <h2 className="border-b border-neutral-400 pb-1 text-sm font-bold text-neutral-900">
              Individual Account Owner
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className={labelClass}>First Name</label>
                <input className={fieldClass} defaultValue="Felton" />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Middle Name</label>
                <input className={fieldClass} defaultValue="Storm" />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Last Name</label>
                <input className={fieldClass} defaultValue="Panda" />
              </div>
            </div>
            <div className="mt-2">
              <label className={labelClass}>Date of Birth</label>
              <input className={fieldClass} type="text" defaultValue="10/04/1969" />
            </div>
            <div className="mt-2">
              <span className={labelClass}>Citizenship</span>
              <div className="mt-1 flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="cit"
                    checked={ukCitizen === "uk"}
                    onChange={() => setUkCitizen("uk")}
                  />
                  U.K Citizen
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="cit"
                    checked={ukCitizen === "non"}
                    onChange={() => setUkCitizen("non")}
                  />
                  Non U.K Citizen
                </label>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Type of ID</label>
                <select className={fieldClass} defaultValue="Driver's License">
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>ID Number</label>
                <input className={fieldClass} defaultValue="12345678" />
              </div>
            </div>
            <DashedRule />
            <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-700">Mailing Address</h3>
            <div className="mt-2 space-y-2">
              <div>
                <label className={labelClass}>Address Line 1</label>
                <input className={fieldClass} defaultValue="house" />
              </div>
              <div>
                <label className={labelClass}>Address Line 2</label>
                <input className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>City</label>
                  <input className={fieldClass} defaultValue="london" />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input className={fieldClass} defaultValue="London" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Country</label>
                  <select className={fieldClass} defaultValue="United Kingdom">
                    <option>United Kingdom</option>
                    <option>United States</option>
                    <option>Philippines</option>
                    <option>Singapore</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input className={fieldClass} defaultValue="nw2645" />
                </div>
              </div>
            </div>
            <DashedRule />
            <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-700">Contact Information</h3>
            <div className="mt-2 space-y-2">
              <div>
                <label className={labelClass}>Primary / Daytime Phone</label>
                <input className={fieldClass} defaultValue="0121345678" />
              </div>
              <div>
                <label className={labelClass}>Home / Evening Phone</label>
                <input className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Cellular / Portable Phone</label>
                <input className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Fax</label>
                <input className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input className={fieldClass} type="email" defaultValue="coa2016cebu@gmail.com" />
              </div>
            </div>
            <DashedRule />
            <div className="mt-2">
              <span className={labelClass}>Filing Status</span>
              <div className="mt-1 flex flex-wrap gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="radio" name="fil" checked={filing === "single"} onChange={() => setFiling("single")} />
                  Single
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="radio" name="fil" checked={filing === "married"} onChange={() => setFiling("married")} />
                  Married
                </label>
              </div>
            </div>
            <div className="mt-2 max-w-[120px]">
              <label className={labelClass}>Number of Dependents</label>
              <input className={fieldClass} type="number" defaultValue={3} min={0} />
            </div>
            <DashedRule />
            <h3 className="text-xs font-bold text-neutral-800">Account Owner (Years of Experience)</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["Stocks", "None"],
                  ["Options", "None"],
                  ["Mutual Funds", "Under 1"],
                  ["Futures", "Under 1"],
                  ["Forex", "Under 1"],
                ] as const
              ).map(([lab, def]) => (
                <div key={lab}>
                  <label className={labelClass}>{lab}</label>
                  <select className={fieldClass} defaultValue={def}>
                    {EXP_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <DashedRule />
            <h3 className="text-xs font-bold text-neutral-800">Average trades executed in a month</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["Stocks", "6 - 25"],
                  ["Options", "None"],
                  ["Funds", "None"],
                  ["Futures", "None"],
                  ["Forex", "None"],
                ] as const
              ).map(([lab, def]) => (
                <div key={lab}>
                  <label className={labelClass}>{lab}</label>
                  <select className={fieldClass} defaultValue={def}>
                    {TRADES_MONTH.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <DashedRule />
            <h3 className="text-xs font-bold text-neutral-800">Rate your trading knowledge</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(["Stocks", "Options", "Funds", "Futures", "Forex"] as const).map((lab) => (
                <div key={lab}>
                  <label className={labelClass}>{lab}</label>
                  <select className={fieldClass} defaultValue="None">
                    {KNOWLEDGE.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* Right: Joint + Financial */}
          <section className="space-y-4">
            <div className="border border-neutral-300 bg-neutral-100 p-3 opacity-90 sm:p-4">
              <h2 className="border-b border-neutral-400 pb-1 text-sm font-bold text-neutral-700">
                Joint Account Owner
              </h2>
              <p className="mt-2 text-xs italic text-neutral-500">
                Complete when account type is Joint. Fields mirror primary owner.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <input className={fieldClass} placeholder="First" disabled />
                <input className={fieldClass} placeholder="Middle" disabled />
                <input className={fieldClass} placeholder="Last" disabled />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className={fieldClass} placeholder="Date of Birth" disabled />
                <input className={fieldClass} placeholder="ID Number" disabled />
              </div>
            </div>

            <div className="border border-neutral-300 bg-neutral-50/50 p-3 sm:p-4">
              <h2 className="border-b border-neutral-400 pb-1 text-sm font-bold text-neutral-900">
                Financial Information
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label className={labelClass}>{req("Approximate Annual Income:")}</label>
                  <select className={fieldClass} defaultValue="GBP 100,000 - GBP 249,999">
                    {GBP_INCOME.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{req("Nested Marginal Bracket:")}</label>
                  <select className={fieldClass} defaultValue="-- Choose One --">
                    {MARGINAL.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{req("Approximate Total Networth:")}</label>
                  <select className={fieldClass} defaultValue="GBP 200,000 - GBP 499,999">
                    {GBP_NET.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] leading-snug text-neutral-600">
                    Include all assets: property, investments, business interests, and personal property.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>{req("Approximate Liquid Networth:")}</label>
                  <select className={fieldClass} defaultValue="GBP 200,000 - GBP 499,999">
                    {GBP_NET.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] leading-snug text-neutral-600">
                    Cash, listed securities, and other assets readily convertible to cash.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>{req("What is your source of income?")}</label>
                  <select className={fieldClass} defaultValue="Inheritance">
                    {SOURCE_INCOME.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <DashedRule />
                <h3 className="text-xs font-bold uppercase text-neutral-700">Contract Details</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Contract Applied For</label>
                    <input className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Number of Contract(s)</label>
                    <input className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Name of Contract(s)</label>
                    <input className={fieldClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>APPLICATION MONIES</label>
                  <input className={fieldClass} placeholder="Enter the application amount" />
                </div>
                <div>
                  <label className={labelClass}>How will you fund your account?</label>
                  <p className="mb-1 text-[10px] text-neutral-600">Source of assets to be deposited</p>
                  <select className={fieldClass} defaultValue="Savings">
                    {SOURCE_ASSETS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}
