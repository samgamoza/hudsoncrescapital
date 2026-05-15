/** Trade Order “Select a Commodity” — optgroups and items (desk reference layout). */
export const COMMODITY_SELECT_GROUPS: { groupLabel: string; items: { value: string; label: string }[] }[] = [
  {
    groupLabel: "--Grains and Oilseeds--",
    items: [
      { value: "wheat", label: "Wheat" },
      { value: "corn", label: "Corn" },
      { value: "soybeans", label: "Soybeans" },
      { value: "soybean_meal", label: "Soybean Meal" },
      { value: "soybean_oil", label: "Soybean Oil" },
      { value: "oats", label: "Oats" },
      { value: "rough_rice", label: "Rough Rice" },
      { value: "hard_red_winter_wheat", label: "Hard Red Winter Wheat" },
      { value: "spring_wheat", label: "Spring Wheat" },
      { value: "canola", label: "Canola" },
    ],
  },
  {
    groupLabel: "--Energies--",
    items: [
      { value: "crude_oil_wti", label: "Crude Oil WTI" },
      { value: "ulsd_ny_harbor", label: "ULSD NY Harbor" },
      { value: "gasoline_rbob", label: "Gasoline RBOB" },
      { value: "natural_gas", label: "Natural Gas" },
      { value: "crude_oil_brent", label: "Crude Oil Brent" },
      { value: "ethanol", label: "Ethanol" },
    ],
  },
  {
    groupLabel: "--Metals--",
    items: [
      { value: "gold", label: "Gold" },
      { value: "silver", label: "Silver" },
      { value: "high_grade_copper", label: "High Grade Copper" },
      { value: "platinum", label: "Platinum" },
      { value: "palladium", label: "Palladium" },
      { value: "aluminum", label: "Aluminum" },
    ],
  },
  {
    groupLabel: "--Livestock and Dairy--",
    items: [
      { value: "live_cattle", label: "Live Cattle" },
      { value: "feeder_cattle", label: "Feeder Cattle" },
      { value: "lean_hogs", label: "Lean Hogs" },
      { value: "pork_cutout", label: "Pork Cutout" },
      { value: "class_iii_milk", label: "Class III Milk" },
      { value: "nonfat_dry_milk", label: "Nonfat Dry Milk" },
      { value: "dry_whey", label: "Dry Whey" },
      { value: "butter_cash_settled", label: "Butter Cash-Settled" },
      { value: "cheese_cash_settled", label: "Cheese Cash-Settled" },
    ],
  },
];

export const COMMODITY_VALUE_TO_LABEL: Record<string, string> = Object.fromEntries(
  COMMODITY_SELECT_GROUPS.flatMap((g) => g.items.map((it) => [it.value, it.label])),
);
