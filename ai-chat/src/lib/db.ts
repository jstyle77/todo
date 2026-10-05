import "server-only";
import { MongoClient, type Db } from "mongodb";
import { env } from "@/lib/env";

// 서버리스 환경과 개발 서버의 HMR에서 연결이 계속 늘어나지 않도록 전역에 캐시한다.
const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
};

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = new MongoClient(env().MONGODB_URI).connect();
  }
  return globalForMongo.mongoClientPromise;
}

let indexesEnsured = false;

export async function getDb(): Promise<Db> {
  const db = (await getMongoClient()).db();
  if (!indexesEnsured) {
    indexesEnsured = true;
    await Promise.all([
      db.collection("conversations").createIndex({ userId: 1, updatedAt: -1 }),
      db.collection("messages").createIndex({ conversationId: 1, createdAt: 1 }),
    ]);
  }
  return db;
}
