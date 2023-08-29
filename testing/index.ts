import { exec } from 'child_process';

import { Post, PrismaClient, Role, User } from '@prisma/client';
import dotenv from 'dotenv';
import { createId } from '@paralleldrive/cuid2';

dotenv.config();

export const seededUsers = [buildUser(1), buildUser(2, { warnings: 5 }), buildUser(3, { warnings: 10 })];
export const seededBlogs = [buildBlog(1, 'blog-1'), buildBlog(2, 'blog-2')];
export const seededPosts = [buildPost(1, { authorId: 1, blogId: 1 }), buildPost(2, { authorId: 2, blogId: 2 })];

export async function simulateSeed(prisma: PrismaClient) {
  await prisma.user.createMany({ data: seededUsers.map(({ id, ...user }) => user) });
  await prisma.blog.createMany({ data: seededBlogs.map(({ id, ...blog }) => blog) });
  await prisma.post.createMany({ data: seededPosts.map(({ id, ...post }) => post) });
}

export async function resetDb() {
  return new Promise<void>((resolve, reject) => {
    exec('yarn db:reset', (error) => {
      if (error) reject(error);
      resolve();
    });
  });
}

export function buildUser(id: number, user: Partial<User> = {}): User & { parameters: any } {
  return {
    id,
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

export function buildPost(id: number, post: Partial<Post> & { authorId: number; blogId: number }) {
  return {
    id,
    title: `title${id}`,
    createdAt: new Date(),
    imprint: '3e937a1f-cd50-422f-bd0d-624d9ccd441d',
    ...post,
  };
}

export function buildBlog(id: number, title: string, imprint = createId()) {
  return {
    id,
    title,
    imprint,
  };
}

export function isUUID(maybeUUID: string) {
  const regexUUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return regexUUID.test(maybeUUID);
}

export function formatEntry(entry: Record<string, unknown>) {
  return entry;
}

export function formatEntries(entries: Array<Record<string, unknown>>) {
  return entries.map((entry) => formatEntry(entry));
}

export function generateId(baseId: number) {
  return baseId;
}
