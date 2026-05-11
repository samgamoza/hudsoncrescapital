import { createFileRoute } from "@tanstack/react-router";
import { listAssetListingsDirect } from "@/server/asset-listings.functions";
import { apiErrorResponse } from "../-_utils";

export const Route = createFileRoute("/api/portal/asset-listings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await listAssetListingsDirect({
            query: "",
            assetClass: "all",
            activeOnly: true,
            etfOnly: false,
            limit: 250,
          });
          return Response.json(data);
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = await listAssetListingsDirect({
            query: String(body?.query ?? ""),
            assetClass: String(body?.assetClass ?? "all"),
            assetType: String(body?.assetType ?? ""),
            exchange: String(body?.exchange ?? ""),
            category: String(body?.category ?? ""),
            subCategory: String(body?.subCategory ?? ""),
            issuer: String(body?.issuer ?? ""),
            settlementType: String(body?.settlementType ?? ""),
            etfOnly: Boolean(body?.etfOnly),
            activeOnly: body?.activeOnly == null ? true : Boolean(body?.activeOnly),
            limit: Number(body?.limit ?? 250),
          });
          return Response.json(data);
        } catch (error) {
          return apiErrorResponse(error);
        }
      },
    },
  },
});
