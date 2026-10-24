// Deliberately stores only non-financial user preferences.
// Financial balances/settlements from the legacy PostgreSQL ledger are NOT migrated.
import { table, integer, text } from 'sdk/db';

export const watchlists = table('watchlists', {
  userId: integer('user_id').primaryKey(),
  symbols: text('symbols').notNull().default('[]'),
});

export const settings = table('user_settings', {
  userId: integer('user_id').primaryKey(),
  language: text('language').notNull().default('en'),
});
