import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AssetListingsResponse } from "@/lib/asset-listings.types";

const listInput = z.object({
  query: z.string().trim().optional().default(""),
  assetClass: z.string().trim().optional().default("all"),
  assetType: z.string().trim().optional().default(""),
  exchange: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  subCategory: z.string().trim().optional().default(""),
  issuer: z.string().trim().optional().default(""),
  settlementType: z.string().trim().optional().default(""),
  etfOnly: z.boolean().optional().default(false),
  activeOnly: z.boolean().optional().default(true),
  limit: z.number().int().min(10).max(500).optional().default(250),
});

export async function listAssetListingsDirect(input: unknown): Promise<AssetListingsResponse> {
  const data = listInput.parse(input);
  let q = ((supabaseAdmin as any).from("asset_listings") as any).select("*", {
    count: "exact",
  });

  if (data.activeOnly) q = q.eq("is_active", true);
  if (data.assetClass && data.assetClass !== "all") q = q.eq("asset_class", data.assetClass);
  if (data.assetType) q = q.eq("asset_type", data.assetType);
  if (data.exchange) q = q.eq("exchange_name", data.exchange);
  if (data.category) q = q.eq("category", data.category);
  if (data.subCategory) q = q.eq("sub_category", data.subCategory);
  if (data.issuer) q = q.eq("issuer", data.issuer);
  if (data.settlementType) q = q.eq("settlement_type", data.settlementType);
  if (data.etfOnly) q = q.eq("is_etf", true);

  const search = data.query.trim();
  if (search) {
    const safe = search.replace(/[%_,]/g, " ");
    q = q.or(
      [
        `symbol.ilike.%${safe}%`,
        `display_symbol.ilike.%${safe}%`,
        `company_name.ilike.%${safe}%`,
        `security_name.ilike.%${safe}%`,
        `instrument_name.ilike.%${safe}%`,
        `base_asset.ilike.%${safe}%`,
        `quote_asset.ilike.%${safe}%`,
        `category.ilike.%${safe}%`,
        `sub_category.ilike.%${safe}%`,
        `exchange_name.ilike.%${safe}%`,
      ].join(","),
    );
  }

  const { data: rows, error, count } = await q
    .order("asset_class", { ascending: true })
    .order("symbol", { ascending: true })
    .limit(data.limit);
  if (error) throw new Error(error.message);
  return { rows: (rows ?? []) as any[], total: Number(count ?? 0) };
}
