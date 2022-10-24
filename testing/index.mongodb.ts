import { exec } from 'child_process';

import { ObjectId } from 'bson';
import { Post, Role, User } from '@prisma/client';
import dotenv from 'dotenv';

import { PrismockClient } from '../src/lib/client';

dotenv.config();

export const seededUsers = [buildUser(1), buildUser(2, { warnings: 5 }), buildUser(3, { warnings: 10 })];
export const seededPosts = [buildPost(1, { authorId: new ObjectId() }), buildPost(2, { authorId: new ObjectId() })];

export function simulateSeed(prismock: PrismockClient) {
  prismock.setData({
    user: seededUsers,
    post: seededPosts,
  });
}

export async function resetDb() {
  return new Promise<void>((resolve, reject) => {
    exec('mongosh mongodb://admin:admin@localhost:27017/prismock --eval "db.dropDatabase()"', (error) => {
      if (error) reject(error);
      resolve();
    });
  });
}

export function buildUser(id: number, user: Partial<User> = {}) {
  return {
    id: new ObjectId(id).toString(),
    email: `user${id}@company.com`,
    password: 'password',
    role: Role.USER,
    warnings: 0,
    banned: false,
    money: BigInt(0),
    friends: 0,
    signal: null,
    parameters: {},
    ...user,
  };
}

export function buildPost(id: number, post: Partial<Omit<Post, 'authorId'>> & { authorId: ObjectId }) {
  return {
    id: new ObjectId(id).toString(),
    title: `title${id}`,
    createdAt: new Date(),
    imprint: '3e937a1f-cd50-422f-bd0d-624d9ccd441d',
    ...post,
  };
}

export function isUUID(maybeUUID: string) {
  const regexUUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return regexUUID.test(maybeUUID);
}

export function hasObjectIdStructure(maybeObjectId: string) {
  return typeof maybeObjectId === 'string' && maybeObjectId.length === 24;
}
