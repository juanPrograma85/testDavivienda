import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

type TransactionWork<T> = (client: PoolClient) => Promise<T>;

@Injectable()
export class PostgresDatabase implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly transaction = new AsyncLocalStorage<PoolClient>();

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const client = this.transaction.getStore();
    return client ? client.query<T>(text, values) : this.pool.query<T>(text, values);
  }

  async withTransaction<T>(work: TransactionWork<T>): Promise<T> {
    const existing = this.transaction.getStore();
    if (existing) return work(existing);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.transaction.run(client, () => work(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}