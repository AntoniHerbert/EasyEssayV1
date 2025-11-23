import { type DrizzleDb } from "./index";
import { type Tx } from "./types";

export interface ITransactionManager {
  transaction<T>(callback: (tx: Tx) => Promise<T>): Promise<T>;
}

export class DbTransactionManager implements ITransactionManager {
  constructor(private db: DrizzleDb) {}

  async transaction<T>(callback: (tx: Tx) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (drizzleTx) => {
      return await callback(drizzleTx);
    });
  }
}


export class MemTransactionManager implements ITransactionManager {
  async transaction<T>(callback: (tx: Tx) => Promise<T>): Promise<T> {
    return await callback(null); 
  }
}