// Open Food Facts client. Free, no API key. We normalize products to a common
// per-100g macro shape. OFF asks clients to send an identifying User-Agent.

const UA = "VXthenics/0.1 (personal fitness app)";
// The legacy /cgi/search.pl is frequently overloaded; OFF's dedicated search
// service is the supported path now.
const SEARCH_URL = "https://search.openfoodfacts.org/search";
const PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

// Normalized food — all macros are per 100 g.
export interface NormalizedFood {
  barcode: string | null;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
}

interface OffNutriments {
  ["energy-kcal_100g"]?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number; // grams
  salt_100g?: number; // grams
}

interface OffProduct {
  code?: string;
  product_name?: string;
  // Legacy API returns a comma string; the search service returns an array.
  brands?: string | string[];
  image_url?: string;
  image_small_url?: string;
  image_front_small_url?: string;
  nutriments?: OffNutriments;
}

function firstBrand(brands?: string | string[]): string | null {
  if (!brands) return null;
  const first = Array.isArray(brands) ? brands[0] : brands.split(",")[0];
  return first?.trim() || null;
}

function num(v: number | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
}

function normalize(p: OffProduct): NormalizedFood | null {
  const name = p.product_name?.trim();
  if (!name) return null;
  const n = p.nutriments ?? {};
  // OFF reports sodium in grams; derive from salt if sodium missing (salt/2.5).
  const sodiumG =
    n.sodium_100g ?? (n.salt_100g != null ? n.salt_100g / 2.5 : undefined);
  return {
    barcode: p.code ?? null,
    name,
    brand: firstBrand(p.brands),
    imageUrl: p.image_small_url ?? p.image_front_small_url ?? p.image_url ?? null,
    calories: num(n["energy-kcal_100g"]),
    proteinG: num(n.proteins_100g),
    carbsG: num(n.carbohydrates_100g),
    fatG: num(n.fat_100g),
    fiberG: num(n.fiber_100g),
    sugarG: num(n.sugars_100g),
    sodiumMg: sodiumG != null ? Math.round(sodiumG * 1000) : null,
  };
}

export async function searchFoods(
  query: string,
  pageSize = 20,
): Promise<NormalizedFood[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: String(pageSize),
    fields:
      "code,product_name,brands,image_url,image_small_url,image_front_small_url,nutriments",
  });
  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Open Food Facts search failed: ${res.status}`);
  const data = (await res.json()) as { hits?: OffProduct[] };
  return (data.hits ?? [])
    .map(normalize)
    .filter((f): f is NormalizedFood => f !== null && f.calories !== null);
}

export async function getFoodByBarcode(
  barcode: string,
): Promise<NormalizedFood | null> {
  const res = await fetch(`${PRODUCT_URL}/${encodeURIComponent(barcode)}.json`, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return null;
  return normalize(data.product);
}
