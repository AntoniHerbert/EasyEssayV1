import { type User, type InsertUser } from "@shared/schema";
import { type Tx } from "../types";

export interface IUserStore {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser, tx?: Tx): Promise<User>;
}