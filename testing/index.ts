import { exec } from 'child_process';

import { Blog, Comment, Post, PrismaClient, Reaction, Role, Service, Subscription, User } from '@prisma/client';
import dotenv from 'dotenv';
import { createId } from '@paralleldrive/cuid2';
export type PostWithComments = Post & { comments: Comment[] };

dotenv.config();

export const seededUsers = [buildUser(1), buildUser(2, { warnings: 5 }), buildUser(3, { warnings: 10 })];
export const seededBlogs = [buildBlog(1, { title: 'blog-1' }), buildBlog(2, { title: 'blog-2', userId: seededUsers[0].id })];
export const seededPosts = [buildPost(1, { authorId: 1, blogId: 1 }), buildPost(2, { authorId: 2, blogId: 2 })];
export const seededServices = [buildService({ userId: 1, name: 'facebook' })];
export const seededReactions = [
  buildReaction({ userId: 1, emoji: 'thumbsup' }),
  buildReaction({ userId: 1, emoji: 'rocket' }),
];

export const seededComments = [buildComment(1), buildComment(2), buildComment(3)];

export async function simulateSeed(prisma: PrismaClient) {
  await prisma.user.createMany({ data: seededUsers.map(({ id, ...user }) => user) });
  await prisma.blog.createMany({ data: seededBlogs.map(({ id, ...blog }) => blog) });
  await prisma.post.createMany({ data: seededPosts.map(({ id, ...post }) => post) });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore MySQL / Tags
  await prisma.service.createMany({ data: seededServices });
  await prisma.reaction.createMany({ data: seededReactions });
  await prisma.comment.createMany({ data: seededComments });
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
    birthday: null,
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

export function buildComment(id: number, comment: Partial<Comment> = {}) {
  return {
    id,
    body: `comment${id}`,
    ...comment,
  };
}

export function buildBlog(id: number, blog: Partial<Blog>) {
  const { title = '', imprint = createId(), priority = 1, category = 'normal', userId } = blog;
  return {
    id,
    title,
    imprint,
    priority,
    category,
    userId,
  };
}

export function buildService(service: Partial<Service> & { userId: number }) {
  const { name = '', userId, tags = [] } = service;

  return {
    name,
    userId,
    tags,
  };
}

export function buildSubscription(id: number, subscription: Partial<Subscription> & { userId: number; blogId: number }) {
  return {
    id,
    ...subscription,
  };
}

export function buildReaction(reaction: Pick<Reaction, 'userId' | 'emoji'>) {
  const { userId, emoji } = reaction;
  return {
    userId,
    emoji,
    value: 0,
  };
}

export function isUUID(maybeUUID: string) {
  const regexUUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return regexUUID.test(maybeUUID);
}

export function formatEntry(entry: Record<string, unknown> | null) {
  return entry;
}

export function formatEntries(entries: Array<Record<string, unknown>>) {
  return entries.map((entry) => formatEntry(entry));
}

export function generateId(baseId: number) {
  return baseId;
}
