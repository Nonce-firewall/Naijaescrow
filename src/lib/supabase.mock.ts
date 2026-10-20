import { vi } from 'vitest';

export interface MockStore {
  settings: any[];
  announcements: any[];
  coins: any[];
  users: any[];
  orders: any[];
  disputes: any[];
  [table: string]: any[];
}

export function createMockSupabase(initialStore?: Partial<MockStore>) {
  const store: MockStore = {
    settings: [],
    announcements: [],
    coins: [],
    users: [],
    orders: [],
    disputes: [],
    ...initialStore,
  };

  const insertCalls: { table: string; data: any }[] = [];
  const updateCalls: { table: string; data: any; filter?: any }[] = [];
  const deleteCalls: { table: string; filter?: any }[] = [];

  const mockClient = {
    _store: store,
    _insertCalls: insertCalls,
    _updateCalls: updateCalls,
    _deleteCalls: deleteCalls,

    from: vi.fn((table: string) => {
      let selectedFields: string | null = null;
      let filters: { field: string; val: any }[] = [];
      let limitCount: number | null = null;
      let orderConfig: { field: string; ascending: boolean } | null = null;

      const builder: any = {
        select: vi.fn((fields: string = '*') => {
          selectedFields = fields;
          return builder;
        }),

        eq: vi.fn((field: string, val: any) => {
          filters.push({ field, val });
          return builder;
        }),

        order: vi.fn((field: string, opts?: { ascending?: boolean }) => {
          orderConfig = { field, ascending: opts?.ascending ?? true };
          return builder;
        }),

        limit: vi.fn((count: number) => {
          limitCount = count;
          return builder;
        }),

        single: vi.fn(async () => {
          const rows = store[table] || [];
          let matches = rows.filter((r) => filters.every((f) => r[f.field] === f.val));
          if (matches.length === 0) {
            return { data: null, error: null };
          }
          return { data: matches[0], error: null };
        }),

        maybeSingle: vi.fn(async () => {
          const rows = store[table] || [];
          let matches = rows.filter((r) => filters.every((f) => r[f.field] === f.val));
          return { data: matches[0] || null, error: null };
        }),

        then: (resolve: any, reject?: any) => {
          const rows = store[table] || [];
          let matches = rows.filter((r) => filters.every((f) => r[f.field] === f.val));
          if (limitCount !== null) {
            matches = matches.slice(0, limitCount);
          }
          return Promise.resolve({ data: matches, error: null }).then(resolve, reject);
        },

        insert: vi.fn((payload: any) => {
          insertCalls.push({ table, data: payload });
          const rawRows = Array.isArray(payload) ? payload : [payload];
          const rowsToInsert = rawRows.map((row) => ({
            id: row.id || `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            ...row,
          }));
          if (!store[table]) store[table] = [];
          store[table].push(...rowsToInsert);

          const resultPromise = Promise.resolve({ data: rowsToInsert[0] || payload, error: null });
          const insertChain: any = {
            then: (res: any, rej?: any) => resultPromise.then(res, rej),
            select: vi.fn((_cols?: string) => ({
              then: (res: any, rej?: any) => Promise.resolve({ data: rowsToInsert, error: null }).then(res, rej),
              single: vi.fn(async () => ({ data: rowsToInsert[0] || { id: 'mock-id-123' }, error: null })),
              maybeSingle: vi.fn(async () => ({ data: rowsToInsert[0] || null, error: null })),
            })),
            single: vi.fn(async () => ({ data: rowsToInsert[0] || { id: 'mock-id-123' }, error: null })),
          };
          return insertChain;
        }),

        upsert: vi.fn((payload: any) => {
          insertCalls.push({ table, data: payload });
          const rowsToInsert = Array.isArray(payload) ? payload : [payload];
          if (!store[table]) store[table] = [];
          store[table].push(...rowsToInsert);

          const resultPromise = Promise.resolve({ data: rowsToInsert[0] || payload, error: null });
          const upsertChain: any = {
            then: (res: any, rej?: any) => resultPromise.then(res, rej),
            select: vi.fn(() => ({
              then: (res: any, rej?: any) => Promise.resolve({ data: rowsToInsert, error: null }).then(res, rej),
              single: vi.fn(async () => ({ data: rowsToInsert[0] || { id: 'mock-id-123' }, error: null })),
            })),
          };
          return upsertChain;
        }),

        update: vi.fn((payload: any) => {
          let updateFilter: any = null;
          const updateBuilder: any = {
            eq: vi.fn(async (field: string, val: any) => {
              updateFilter = { field, val };
              updateCalls.push({ table, data: payload, filter: updateFilter });
              if (store[table]) {
                store[table] = store[table].map((row) =>
                  row[field] === val ? { ...row, ...payload } : row
                );
              }
              return { data: payload, error: null };
            }),
          };
          return updateBuilder;
        }),

        delete: vi.fn(() => {
          const deleteBuilder: any = {
            eq: vi.fn(async (field: string, val: any) => {
              deleteCalls.push({ table, filter: { field, val } });
              if (store[table]) {
                store[table] = store[table].filter((row) => row[field] !== val);
              }
              return { error: null };
            }),
          };
          return deleteBuilder;
        }),
      };

      return builder;
    }),

    auth: {
      signInWithPassword: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        })
      ),
      signUp: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null,
        })
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      updateUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })
      ),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },

    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return mockClient;
}

export const mockSupabase = createMockSupabase();
