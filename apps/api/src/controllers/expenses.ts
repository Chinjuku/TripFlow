import * as expensesService from '../services/expenses';

type AuthContext = { user: { sub: string } };

export async function handleCreateExpense({ user, body }: AuthContext & { body: any }) {
  return await expensesService.createExpense(user.sub, body);
}
