import { describe, expect, test, mock } from 'bun:test';

// 1. Define mocked table objects
const expensesTable = { name: 'expenses' };
const expenseSplitsTable = { name: 'expenseSplits' };
const settlementsTable = { name: 'settlements' };
const tripBudgetsTable = { name: 'tripBudgets' };
const userPaymentDetailsTable = { name: 'userPaymentDetails' };
const tripMembersTable = { name: 'tripMembers' };
const tripsTable = { name: 'trips' };

// 2. Setup mock data storage
let mockExpenses: any[] = [];
let mockSplits: any[] = [];
let mockSettlements: any[] = [];
let mockTripRow: any = { id: 'some-trip-id', is_debt_optimized: false };

// 3. Mock the @trip-flow/db/server module completely
mock.module('@trip-flow/db/server', () => ({
  db: {
    select: () => ({
      from: (table: any) => {
        let result: any[] = [];
        if (table === expensesTable) {
          result = mockExpenses;
        } else if (table === expenseSplitsTable) {
          result = mockSplits;
        } else if (table === settlementsTable) {
          result = mockSettlements;
        } else if (table === tripsTable) {
          result = [mockTripRow];
        } else if (table === tripMembersTable) {
          result = [{ id: 'membership-id' }];
        } else if (table === tripBudgetsTable) {
          result = [];
        } else if (table === userPaymentDetailsTable) {
          result = [];
        }

        const chain = {
          where: () => chain,
          orderBy: () => chain,
          limit: () => chain,
          then: (resolve: any) => Promise.resolve(resolve(result)),
        };
        // Support direct await
        Object.assign(chain, {
          then: (onfulfilled?: any) => Promise.resolve(result).then(onfulfilled),
        });
        return chain;
      },
    }),
  },
  expenses: expensesTable,
  expenseSplits: expenseSplitsTable,
  settlements: settlementsTable,
  tripBudgets: tripBudgetsTable,
  userPaymentDetails: userPaymentDetailsTable,
  tripMembers: tripMembersTable,
  trips: tripsTable,
}));

// 4. Mock the loadTripMembers from './trips'
mock.module('./trips', () => ({
  loadTripMembers: async (tripId: string) => [
    { userId: 'user-a', name: 'Alice', avatarUrl: null },
    { userId: 'user-b', name: 'Bob', avatarUrl: null },
    { userId: 'user-c', name: 'Charlie', avatarUrl: null },
  ],
}));

describe('Finance calculations', () => {
  test('No netting when optimized=false (keeps debts separate)', async () => {
    const { getFinancesByTripId } = await import('../services/finances');

    mockTripRow = { id: 'some-trip-id', is_debt_optimized: false };

    // Bob paid 600, split A: 200, B: 200, C: 200
    // Alice (User A) paid 900, split A: 300, B: 300, C: 300
    mockExpenses = [
      {
        id: 'exp-1',
        paid_by_id: 'user-b',
        amount: 600,
        description: 'Lunch',
        expense_date: '2026-05-25T00:00:00Z',
        created_at: '2026-05-25T00:00:00Z',
        category: 'food',
        split_method: 'equally',
      },
      {
        id: 'exp-2',
        paid_by_id: 'user-a',
        amount: 900,
        description: 'Car Rental',
        expense_date: '2026-05-25T01:00:00Z',
        created_at: '2026-05-25T01:00:00Z',
        category: 'transport',
        split_method: 'equally',
      },
    ];

    mockSplits = [
      // Splits for exp-1 (Bob paid)
      { expense_id: 'exp-1', user_id: 'user-a', amount: 200 },
      { expense_id: 'exp-1', user_id: 'user-b', amount: 200 },
      { expense_id: 'exp-1', user_id: 'user-c', amount: 200 },
      // Splits for exp-2 (Alice paid)
      { expense_id: 'exp-2', user_id: 'user-a', amount: 300 },
      { expense_id: 'exp-2', user_id: 'user-b', amount: 300 },
      { expense_id: 'exp-2', user_id: 'user-c', amount: 300 },
    ];

    mockSettlements = [];

    // Alice fetches finances without optimization (optimized=false)
    const data = await getFinancesByTripId('user-a', 'some-trip-id', false);

    // Alice is owed 300 by Bob and 300 by Charlie
    const bobDebtor = data.summary.whoOwesYou.find((d) => d.userId === 'user-b');
    const charlieDebtor = data.summary.whoOwesYou.find((d) => d.userId === 'user-c');
    expect(bobDebtor?.amount).toBe(300);
    expect(charlieDebtor?.amount).toBe(300);

    // Alice owes Bob 200
    const bobCreditor = data.summary.whatYouOwe.find((c) => c.userId === 'user-b');
    expect(bobCreditor?.amount).toBe(200);
  });

  test('Pairwise netting when optimized=true (nets opposing debts)', async () => {
    const { getFinancesByTripId } = await import('../services/finances');

    mockTripRow = { id: 'some-trip-id', is_debt_optimized: true };

    mockExpenses = [
      {
        id: 'exp-1',
        paid_by_id: 'user-b',
        amount: 600,
        description: 'Lunch',
        expense_date: '2026-05-25T00:00:00Z',
        created_at: '2026-05-25T00:00:00Z',
        category: 'food',
        split_method: 'equally',
      },
      {
        id: 'exp-2',
        paid_by_id: 'user-a',
        amount: 900,
        description: 'Car Rental',
        expense_date: '2026-05-25T01:00:00Z',
        created_at: '2026-05-25T01:00:00Z',
        category: 'transport',
        split_method: 'equally',
      },
    ];

    mockSplits = [
      { expense_id: 'exp-1', user_id: 'user-a', amount: 200 },
      { expense_id: 'exp-1', user_id: 'user-b', amount: 200 },
      { expense_id: 'exp-1', user_id: 'user-c', amount: 200 },
      { expense_id: 'exp-2', user_id: 'user-a', amount: 300 },
      { expense_id: 'exp-2', user_id: 'user-b', amount: 300 },
      { expense_id: 'exp-2', user_id: 'user-c', amount: 300 },
    ];

    mockSettlements = [];

    // Alice fetches finances with optimization (optimized=true)
    const data = await getFinancesByTripId('user-a', 'some-trip-id', true);

    // Netted pairwise: Bob owes Alice 100, Alice owes Bob 0.
    const bobDebtor = data.summary.whoOwesYou.find((d) => d.userId === 'user-b');
    expect(bobDebtor?.amount).toBe(100);
    expect(data.summary.whatYouOwe.length).toBe(0);
  });

  test('Override to false even when DB has optimized=true (e.g., Settlements page)', async () => {
    const { getFinancesByTripId } = await import('../services/finances');

    mockTripRow = { id: 'some-trip-id', is_debt_optimized: true };

    mockExpenses = [
      {
        id: 'exp-1',
        paid_by_id: 'user-b',
        amount: 600,
        description: 'Lunch',
        expense_date: '2026-05-25T00:00:00Z',
        created_at: '2026-05-25T00:00:00Z',
        category: 'food',
        split_method: 'equally',
      },
      {
        id: 'exp-2',
        paid_by_id: 'user-a',
        amount: 900,
        description: 'Car Rental',
        expense_date: '2026-05-25T01:00:00Z',
        created_at: '2026-05-25T01:00:00Z',
        category: 'transport',
        split_method: 'equally',
      },
    ];

    mockSplits = [
      { expense_id: 'exp-1', user_id: 'user-a', amount: 200 },
      { expense_id: 'exp-1', user_id: 'user-b', amount: 200 },
      { expense_id: 'exp-1', user_id: 'user-c', amount: 200 },
      { expense_id: 'exp-2', user_id: 'user-a', amount: 300 },
      { expense_id: 'exp-2', user_id: 'user-b', amount: 300 },
      { expense_id: 'exp-2', user_id: 'user-c', amount: 300 },
    ];

    mockSettlements = [];

    // Alice fetches finances with DB optimized=true, but overrides it to false (e.g. settlements tab)
    const data = await getFinancesByTripId('user-a', 'some-trip-id', false);

    // Should NOT be netted pairwise (keeps debts separate)
    const bobDebtor = data.summary.whoOwesYou.find((d) => d.userId === 'user-b');
    const bobCreditor = data.summary.whatYouOwe.find((c) => c.userId === 'user-b');
    expect(bobDebtor?.amount).toBe(300);
    expect(bobCreditor?.amount).toBe(200);
  });
});
