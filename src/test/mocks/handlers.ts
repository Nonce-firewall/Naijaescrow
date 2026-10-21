import { vi } from 'vitest';

export interface MockRates {
  tether?: { ngn?: number; usd?: number };
  bitcoin?: { usd?: number };
  ethereum?: { usd?: number };
  binancecoin?: { usd?: number };
  solana?: { usd?: number };
  [key: string]: any;
}

export const DEFAULT_MOCK_RATES: MockRates = {
  tether: { ngn: 1540, usd: 1.0 },
  bitcoin: { usd: 65000 },
  ethereum: { usd: 3500 },
  binancecoin: { usd: 600 },
  solana: { usd: 150 },
};

/**
 * Installs a global fetch mock handler that returns mock responses for CoinGecko
 * and other external APIs, preventing real network calls in tests.
 */
export function setupFetchMock(customRates?: MockRates) {
  const rates = { ...DEFAULT_MOCK_RATES, ...customRates };

  const originalFetch = global.fetch;

  const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // CoinGecko API calls
    if (url.includes('api.coingecko.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => rates,
        text: async () => JSON.stringify(rates),
      } as Response;
    }

    // Default mock response for other APIs
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}',
    } as Response;
  });

  global.fetch = mockFetch as any;

  return {
    mockFetch,
    restore: () => {
      global.fetch = originalFetch;
    },
  };
}
