import { type Inspiration, type InsertInspiration } from "@shared/schema";
import { type Tx } from "../types";

export interface IInspirationStore {
  getInspirations(category?: string, type?: string): Promise<Inspiration[]>;
  getInspiration(id: string): Promise<Inspiration | undefined>;
  createInspiration(inspiration: InsertInspiration, tx?: Tx): Promise<Inspiration>;
  updateInspiration(id: string, updates: Partial<InsertInspiration>, tx?: Tx): Promise<Inspiration | undefined>;
}