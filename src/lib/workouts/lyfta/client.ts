import { WorkoutProviderError } from "../provider";

const BASE_URL = "https://my.lyfta.app";
const PROVIDER = "lyfta";
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Low-level Lyfta HTTP client. Note: Lyfta returns HTTP 200 even for auth
// failures, signalling errors via `status: false` in the JSON body. It also
// rate-limits (HTTP 429), so we retry with backoff honoring Retry-After.
export class LyftaClient {
  constructor(private readonly apiKey: string) {}

  async get<T>(
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          cache: "no-store",
        });
      } catch (err) {
        throw new WorkoutProviderError(
          `Could not reach Lyfta: ${err instanceof Error ? err.message : "network error"}`,
          { provider: PROVIDER },
        );
      }

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : 1000 * 2 ** attempt; // 1s, 2s, 4s
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        throw new WorkoutProviderError(
          res.status === 429
            ? "Lyfta rate limit exceeded — try again shortly."
            : `Lyfta returned HTTP ${res.status}`,
          { status: res.status, provider: PROVIDER },
        );
      }

      const body = (await res.json()) as T & {
        status?: boolean;
        message?: string;
      };

      if (body.status === false) {
        throw new WorkoutProviderError(body.message ?? "Lyfta request failed", {
          status: res.status,
          provider: PROVIDER,
        });
      }

      return body;
    }
  }
}

// Used by the setup screen's "test connection" button.
export async function testLyftaConnection(
  apiKey: string,
): Promise<{ ok: true; username?: string } | { ok: false; message: string }> {
  const client = new LyftaClient(apiKey);
  try {
    // The workouts endpoint includes the user's name; a cheap 1-row call
    // confirms the key works and tells us who it belongs to.
    const res = await client.get<{
      workouts?: { user?: { username?: string } }[];
    }>("/api/v1/workouts", { limit: 1, page: 1 });
    return { ok: true, username: res.workouts?.[0]?.user?.username };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof WorkoutProviderError
          ? err.message
          : "Connection failed",
    };
  }
}
