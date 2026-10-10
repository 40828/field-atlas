import { and, desc, eq } from "drizzle-orm";
import { edb, schema } from "../db";
import type { BusinessRow, FavoriteRow, ProjectRow } from "../schema";
import { isUuid } from "./core";

const { favorites, businesses, projects } = schema;

export async function listCatalog(accountId: string): Promise<ProjectRow[]> {
  const db = await edb();
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.accountId, accountId), eq(projects.listedInCatalog, true)))
    .orderBy(desc(projects.updatedAt))
    .limit(100);
}

export async function listFavorites(accountId: string): Promise<FavoriteRow[]> {
  const db = await edb();
  return db.select().from(favorites).where(eq(favorites.accountId, accountId)).orderBy(desc(favorites.createdAt)).limit(200);
}

export async function toggleFavorite(accountId: string, projectId: string): Promise<{ favorited: boolean }> {
  if (!isUuid(projectId)) return { favorited: false };
  const db = await edb();
  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.accountId, accountId), eq(favorites.projectId, projectId)))
    .limit(1);
  if (existing) {
    await db.delete(favorites).where(and(eq(favorites.accountId, accountId), eq(favorites.projectId, projectId)));
    return { favorited: false };
  }
  await db.insert(favorites).values({ accountId, projectId });
  return { favorited: true };
}

export async function insertBusiness(b: typeof businesses.$inferInsert): Promise<BusinessRow> {
  const db = await edb();
  const [row] = await db.insert(businesses).values(b).returning();
  return row;
}

export async function listBusinesses(accountId: string): Promise<BusinessRow[]> {
  const db = await edb();
  return db.select().from(businesses).where(eq(businesses.accountId, accountId)).orderBy(desc(businesses.createdAt)).limit(50);
}

export async function updateBusiness(accountId: string, id: string, patch: Partial<typeof businesses.$inferInsert>): Promise<BusinessRow | null> {
  if (!isUuid(id)) return null;
  const db = await edb();
  const [row] = await db
    .update(businesses)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(businesses.accountId, accountId), eq(businesses.id, id)))
    .returning();
  return row ?? null;
}
