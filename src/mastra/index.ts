import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { PostgresStore } from '@mastra/pg';
import { weatherWorkflow } from './workflows';
// import { weatherAgent } from './agents';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  // agents: { weatherAgent },
  storage: new PostgresStore({
    connectionString: process.env.POSTGRES_URL as string,
  }),
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
