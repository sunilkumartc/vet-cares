import { MongoClient } from 'mongodb';
import { config } from './config.js';

let client = null;

export async function getMongoClient() {
  if (!client) {
    client = new MongoClient(config.MONGO_URI);
    await client.connect();
  }
  return client;
} 