import { MongoClient } from 'mongodb';
import { config } from './config';

let client: MongoClient;

export async function getMongoClient() {
  if (!client) {
    client = new MongoClient(config.MONGO_URI);
    await client.connect();
  }
  return client;
} 