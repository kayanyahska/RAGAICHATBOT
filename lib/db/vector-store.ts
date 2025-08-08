import { PgVector } from '@mastra/pg';

export const store = new PgVector({
  connectionString: process.env.POSTGRES_URL as string,
});
