/** Option lists for the multi-step investor open-account flow (legacy reference field set). */

export const EXP_YEARS = ["None", "Under 1", "1 - 3", "3 - 5", "Over 5"] as const;
export const TRADES_MONTH = ["None", "1 - 5", "6 - 25", "26 - 100", "Over 100"] as const;
export const KNOWLEDGE = ["None", "Limited", "Moderate", "Good", "Extensive"] as const;
export const GBP_INCOME = [
  "-- Choose One --",
  "Under GBP 25,000",
  "GBP 25,000 - GBP 49,999",
  "GBP 50,000 - GBP 99,999",
  "GBP 100,000 - GBP 249,999",
  "GBP 250,000 - GBP 499,999",
  "Over GBP 500,000",
] as const;
export const GBP_NET = [
  "-- Choose One --",
  "Under GBP 50,000",
  "GBP 50,000 - GBP 199,999",
  "GBP 200,000 - GBP 499,999",
  "GBP 500,000 - GBP 999,999",
  "GBP 1,000,000 - GBP 4,999,999",
  "Over GBP 5,000,000",
] as const;
export const MARGINAL = ["-- Choose One --", "20%", "40%", "45%", "Additional rate"] as const;
export const SOURCE_INCOME = [
  "-- Choose One --",
  "Employment",
  "Savings",
  "Investments",
  "Inheritance",
  "Business",
  "Other",
] as const;
export const SOURCE_ASSETS = [
  "-- Choose One --",
  "Savings",
  "Sale of property",
  "Sale of securities",
  "Gift",
  "Loan",
  "Other",
] as const;
export const ID_TYPES = ["Driver's License", "Passport", "National ID", "Other"] as const;
export const ACCOUNT_TYPES = ["Individual", "Joint", "Corporate", "Trust", "IRA"] as const;
export const SALES_REPS = [
  "Adam Christian Drake",
  "Sarah Mitchell",
  "James Porter",
  "Elena Vasquez",
  "Unassigned",
] as const;

export const MAIL_COUNTRIES = ["United Kingdom", "United States", "Philippines", "Singapore", "Other"] as const;
