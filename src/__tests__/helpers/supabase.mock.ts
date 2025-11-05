export class MockSupabaseClient {
  private mockData: Map<string, any[]> = new Map();
  private authUser: any = null;
  private authSession: any = null;

  constructor() {
    this.mockData.set('businesses', []);
    this.mockData.set('employees', []);
    this.mockData.set('customers', []);
    this.mockData.set('services', []);
    this.mockData.set('appointments', []);
    this.mockData.set('working_hours', []);
  }

  setAuthUser(user: any, session: any = null) {
    this.authUser = user;
    this.authSession = session;
  }

  clearAuthUser() {
    this.authUser = null;
    this.authSession = null;
  }

  seedData(table: string, data: any[]) {
    this.mockData.set(table, data);
  }

  clearData(table?: string) {
    if (table) {
      this.mockData.set(table, []);
    } else {
      this.mockData.forEach((_, key) => this.mockData.set(key, []));
    }
  }

  from(table: string) {
    const data = this.mockData.get(table) || [];

    return {
      select: (columns = '*') => this.createQueryBuilder(table, data, 'select', columns),
      insert: (values: any) => this.createQueryBuilder(table, data, 'insert', values),
      update: (values: any) => this.createQueryBuilder(table, data, 'update', values),
      delete: () => this.createQueryBuilder(table, data, 'delete'),
    };
  }

  private createQueryBuilder(table: string, data: any[], operation: string, payload?: any) {
    let filteredData = [...data];
    let filters: any[] = [];
    let orderBy: { column: string; ascending: boolean } | null = null;
    let limitValue: number | null = null;

    const builder = {
      eq: (column: string, value: any) => {
        filters.push({ type: 'eq', column, value });
        return builder;
      },

      in: (column: string, values: any[]) => {
        filters.push({ type: 'in', column, values });
        return builder;
      },

      gte: (column: string, value: any) => {
        filters.push({ type: 'gte', column, value });
        return builder;
      },

      lte: (column: string, value: any) => {
        filters.push({ type: 'lte', column, value });
        return builder;
      },

      or: (condition: string) => {
        filters.push({ type: 'or', condition });
        return builder;
      },

      order: (column: string, options: { ascending: boolean } = { ascending: true }) => {
        orderBy = { column, ascending: options.ascending };
        return builder;
      },

      limit: (count: number) => {
        limitValue = count;
        return builder;
      },

      single: async () => {
        const result = await builder.execute();
        if (result.error) return result;
        
        if (!result.data || result.data.length === 0) {
          return { data: null, error: { message: 'No rows found' } };
        }

        return { data: result.data[0], error: null };
      },

      maybeSingle: async () => {
        const result = await builder.execute();
        if (result.error) return result;
        
        return { data: result.data?.[0] || null, error: null };
      },

      execute: async () => {
        return this.executeQuery(table, operation, payload, filters, orderBy, limitValue);
      },
    };

    if (operation === 'select') {
      return { ...builder, then: (resolve: any) => builder.execute().then(resolve) };
    }

    return builder;
  }

  private async executeQuery(
    table: string,
    operation: string,
    payload: any,
    filters: any[],
    orderBy: any,
    limitValue: number | null
  ) {
    const data = this.mockData.get(table) || [];

    if (operation === 'insert') {
      const newRecords = Array.isArray(payload) ? payload : [payload];
      const insertedRecords = newRecords.map(record => ({
        id: record.id || Math.random().toString(36).substr(2, 9),
        ...record,
      }));

      data.push(...insertedRecords);
      this.mockData.set(table, data);

      return { data: Array.isArray(payload) ? insertedRecords : insertedRecords[0], error: null };
    }

    let filtered = this.applyFilters(data, filters);

    if (operation === 'update') {
      filtered.forEach(record => Object.assign(record, payload));
      return { data: filtered.length === 1 ? filtered[0] : filtered, error: null };
    }

    if (operation === 'delete') {
      const remaining = data.filter(record => !filtered.includes(record));
      this.mockData.set(table, remaining);
      return { data: filtered, error: null };
    }

    if (orderBy) {
      filtered.sort((a, b) => {
        const aVal = a[orderBy.column];
        const bVal = b[orderBy.column];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return orderBy.ascending ? comparison : -comparison;
      });
    }

    if (limitValue !== null) {
      filtered = filtered.slice(0, limitValue);
    }

    return { data: filtered, error: null };
  }

  private applyFilters(data: any[], filters: any[]) {
    return data.filter(record => {
      return filters.every(filter => {
        if (filter.type === 'eq') {
          return record[filter.column] === filter.value;
        }
        if (filter.type === 'in') {
          return filter.values.includes(record[filter.column]);
        }
        if (filter.type === 'gte') {
          return record[filter.column] >= filter.value;
        }
        if (filter.type === 'lte') {
          return record[filter.column] <= filter.value;
        }
        return true;
      });
    });
  }

  get auth() {
    return {
      getUser: async (token: string) => {
        if (!this.authUser || token !== 'valid-token') {
          return { data: { user: null }, error: { message: 'Invalid token' } };
        }
        return { data: { user: this.authUser }, error: null };
      },

      signInWithPassword: async (credentials: { email: string; password: string }) => {
        if (!this.authUser || this.authUser.email !== credentials.email) {
          return { 
            data: { user: null, session: null }, 
            error: { message: 'Invalid credentials' } 
          };
        }
        return { 
          data: { user: this.authUser, session: this.authSession }, 
          error: null 
        };
      },

      signOut: async () => {
        return { error: null };
      },

      refreshSession: async ({ refresh_token }: { refresh_token: string }) => {
        if (refresh_token !== 'valid-refresh-token') {
          return { data: { session: null }, error: { message: 'Invalid refresh token' } };
        }
        return { data: { session: this.authSession }, error: null };
      },

      resetPasswordForEmail: async (email: string) => {
        return { error: null };
      },

      admin: {
        listUsers: async () => {
          return { data: { users: this.authUser ? [this.authUser] : [] }, error: null };
        },

        createUser: async (userData: any) => {
          const user = {
            id: Math.random().toString(36).substr(2, 9),
            ...userData,
            created_at: new Date().toISOString(),
          };
          this.authUser = user;
          return { data: { user }, error: null };
        },

        deleteUser: async (userId: string) => {
          if (this.authUser?.id === userId) {
            this.authUser = null;
          }
          return { data: null, error: null };
        },

        updateUserById: async (userId: string, updates: any) => {
          if (this.authUser?.id === userId) {
            Object.assign(this.authUser, updates);
          }
          return { data: { user: this.authUser }, error: null };
        },
      },
    };
  }
}

export function createMockSupabase() {
  return new MockSupabaseClient();
}