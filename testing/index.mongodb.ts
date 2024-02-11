import { exec } from 'child_process';

import { ObjectId } from 'bson';
import { Blog, Post, PrismaClient, Role, User } from '@prisma/client';
import dotenv from 'dotenv';
import { createId } from '@paralleldrive/cuid2';

dotenv.config();

export const seededUsers = [buildUser(1, { warnings: 0 }), buildUser(2, { warnings: 5 }), buildUser(3, { warnings: 10 })];
export const seededBlogs = [buildBlog(1, { title: 'blog-1' }), buildBlog(2, { title: 'blog-2', userId: seededUsers[1].id })];

export const seededPosts = [
  buildPost(1, { authorId: seededUsers[0].id, blogId: seededBlogs[0].id }),
  buildPost(2, { authorId: seededUsers[1].id, blogId: seededBlogs[1].id }),
];

export async function simulateSeed(prisma: PrismaClient) {
  await prisma.user.createMany({ data: seededUsers.map(({ id, ...user }) => user) });
  const savedUsers = await prisma.user.findMany();

  const blogsToSave = [
    { ...seededBlogs[0], userId: savedUsers[0].id },
    { ...seededBlogs[1], userId: savedUsers[1].id },
  ];

  await prisma.blog.createMany({ data: blogsToSave.map(({ id, ...blog }) => blog) });

  const savedBlogs = await prisma.blog.findMany();

  const postsToSave = [
    buildPost(1, { authorId: savedUsers[0].id, blogId: savedBlogs[0].id }),
    buildPost(2, { authorId: savedUsers[1].id, blogId: savedBlogs[1].id }),
  ];

  await prisma.post.createMany({ data: postsToSave.map(({ id, ...post }) => ({ ...post })) });
}

export async function resetDb() {
  return new Promise<void>((resolve, reject) => {
    exec(
      'mongosh mongodb://admin:admin@localhost:27017 --eval "use prismock" --eval "db.dropDatabase()" && yarn prisma db push && yarn prisma db seed',
      (error) => {
        if (error) reject(error);
        resolve();
      },
    );
  });
}

export function buildUser(id: number, user: Partial<User> = {}): User & { parameters: any } {
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

export function buildPost(id: number, post: Partial<Omit<Post, 'authorId'>> & { authorId: string; blogId: string }) {
  return {
    id: new ObjectId(id).toString(),
    title: `title${id}`,
    createdAt: new Date(),
    imprint: '3e937a1f-cd50-422f-bd0d-624d9ccd441d',
    ...post,
  };
}

export function buildBlog(id: number, blog: Partial<Blog>) {
  const { title = '', imprint = createId(), priority = 1, category = 'normal', userId = seededUsers[0].id } = blog;

  return {
    id: new ObjectId(id).toString(),
    title,
    imprint,
    priority,
    category,
    userId,
  };
}

export function isUUID(maybeUUID: string) {
  const regexUUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return regexUUID.test(maybeUUID);
}

export function hasObjectIdStructure(maybeObjectId: any) {
  return typeof maybeObjectId === 'string' && maybeObjectId.length === 24;
}

export function formatEntry(entry: Record<string, unknown> | null) {
  if (entry?.id) {
    const { id, ...formated } = entry;

    expect(hasObjectIdStructure(id)).toBe(true);

    return formated;
  }

  return entry;
}

export function formatEntries(entries: Array<Record<string, unknown>>) {
  return entries.map((entry) => formatEntry(entry));
}

export function generateId(baseId: number) {
  return new ObjectId(baseId).toString();
}
