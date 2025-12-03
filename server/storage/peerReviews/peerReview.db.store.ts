import { type DrizzleDb } from "../index";
import * as schema from "@shared/schema";
import { eq, and, desc, count, avg, lt } from "drizzle-orm";
import { type PeerReview, type InsertPeerReview, type CorrectionObject } from "@shared/schema";
import { IPeerReviewStore } from "./peerReview.store";
import { type Tx } from "../types"; 


export class PeerReviewDbStore implements IPeerReviewStore {
  private db;

  constructor(db: DrizzleDb) {
    this.db = db;
  }

  async getEssayStats(essayId: string): Promise<{ count: number; average: number }> {
    const result = await this.db
      .select({
        count: count(),
        average: avg(schema.peerReviews.overallScore)
      })
      .from(schema.peerReviews)
      .where(eq(schema.peerReviews.essayId, essayId));

    const stats = result[0];
    
    return {
      count: stats.count,
      average: stats.average ? Math.round(Number(stats.average)) : 0
    };
  }

  async getPeerReviews(
    essayId: string, 
    limit = 10, 
    cursor?: Date
  ): Promise<schema.PeerReviewWithProfile[]> {
    let query = this.db
      .select({
        review: schema.peerReviews,
        profileDisplayName: schema.userProfiles.displayName,
      })
      .from(schema.peerReviews)
      .leftJoin(
        schema.userProfiles,
        eq(schema.peerReviews.reviewerId, schema.userProfiles.userId)
      );

      const conditions = [eq(schema.peerReviews.essayId, essayId)];

    if (cursor) {
      conditions.push(lt(schema.peerReviews.createdAt, cursor));
    }

    const rows = await query
      .where(and(...conditions))
      .limit(limit)
      .orderBy(desc(schema.peerReviews.createdAt));

    return rows.map(({ review, profileDisplayName }) => {
      let reviewerName = profileDisplayName;

      // Tratamento especial para a IA ou usuários deletados
      if (!reviewerName) {
        if (review.reviewerId === 'AI') {
          reviewerName = 'AI Assistant';
        } else {
          reviewerName = 'Anonymous';
        }
      }

      return {
        ...review,
        reviewerName,
      };
    });

    
  }

  async getPeerReview(essayId: string, reviewerId: string): Promise<schema.PeerReviewWithProfile | undefined> {
    const result = await this.db
      .select({
        ...schema.peerReviews,
        reviewerName: schema.userProfiles.displayName,
      })
      .from(schema.peerReviews)
      .leftJoin(schema.userProfiles, eq(schema.peerReviews.reviewerId, schema.userProfiles.userId))
      .where(and(
        eq(schema.peerReviews.essayId, essayId),
        eq(schema.peerReviews.reviewerId, reviewerId)
      ));
    return result[0];
  }

  async getPeerReviewById(id: string): Promise<schema.PeerReviewWithProfile | undefined> {
    const result = await this.db
      .select({
        ...schema.peerReviews,
        reviewerName: schema.userProfiles.displayName,
      })
      .from(schema.peerReviews)
      .leftJoin(schema.userProfiles, eq(schema.peerReviews.reviewerId, schema.userProfiles.userId))
      .where(eq(schema.peerReviews.id, id));
    return result[0];
  }

  async createPeerReview(review: InsertPeerReview, tx?: Tx): Promise<PeerReview> {
    const executor = (tx || this.db) as DrizzleDb;

    const result = await executor.insert(schema.peerReviews).values(review as any).returning();
    return result[0];
  }

  async updatePeerReview(id: string, updates: Partial<InsertPeerReview>, tx?: Tx): Promise<PeerReview | undefined> {
    const executor = (tx || this.db) as DrizzleDb;
 
    const result = await executor
      .update(schema.peerReviews)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(schema.peerReviews.id, id))
      .returning();
    return result[0];
  }

  async addCorrectionToReview(reviewId: string, correction: CorrectionObject, tx?: Tx): Promise<PeerReview | undefined> {
    const executor = (tx || this.db) as DrizzleDb;

    const review = await this.getPeerReviewById(reviewId); 
    if (!review) return undefined;
    
    const corrections = [...(review.corrections as CorrectionObject[] || []), correction];
    const result = await executor
      .update(schema.peerReviews)
      .set({ corrections: corrections as any, updatedAt: new Date() })
      .where(eq(schema.peerReviews.id, reviewId))
      .returning();
    return result[0];
  }

  async deleteByEssayId(essayId: string, tx?: Tx): Promise<void> {
    const executor = (tx || this.db) as DrizzleDb;
    await executor
      .delete(schema.peerReviews)
      .where(eq(schema.peerReviews.essayId, essayId));
  }
}