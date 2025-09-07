/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, seededPosts, seededUsers, formatEntries, formatEntry } from '../../../testing';
import { PrismockClient, PrismockClientType, relationshipStore } from '../../lib/client';

jest.setTimeout(40000);

describe('update (connect)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let realAuthor: User;
  let mockAuthor: User;

  beforeEach(() => relationshipStore.resetValues());

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    realAuthor = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;

    realUser = await prisma.user.update({
      where: { email: seededUsers[0].email },
      data: { posts: { connect: { title: seededPosts[1].title } } },
    });

    mockUser = await prismock.user.update({
      where: { email: seededUsers[0].email },
      data: { posts: { connect: { title: seededPosts[1].title } } },
    });
  });

  it('Should return connected', () => {
    const expected = seededUsers[0];
    expect(formatEntry(realUser)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
  });

  it('Should store connected', async () => {
    const stored = await prisma.post.findMany();
    const mockStored = prismock.getData().post;

    expect(formatEntries(stored.map(({ createdAt, imprint, blogId, ...post }) => post))).toEqual(
      formatEntries(seededPosts.map(({ createdAt, imprint, blogId, ...post }) => ({ ...post, authorId: realAuthor.id }))),
    );
    expect(formatEntries(mockStored.map(({ createdAt, imprint, blogId, ...post }) => post))).toEqual(
      formatEntries(seededPosts.map(({ createdAt, imprint, blogId, ...post }) => ({ ...post, authorId: mockAuthor.id }))),
    );
  });

  it('Should connect many to many relationships', async () => {
    const updatePayload = {
      where: { id: 1 },
      data: {
        comments: {
          connect: [{ id: 1 }, { id: 2 }],
        },
      },
    };

    const findCommentsPayload = {
      where: {
        posts: {
          some: {
            id: 1,
          },
        },
      },
      include: { posts: true },
    };
    await prisma.post.update(updatePayload);
    await prismock.post.update(updatePayload);

    const findPostPayload = { where: { id: 1 }, include: { comments: true } };

    const updatedPost = await prisma.post.findFirst(findPostPayload);
    const updatedMockedPost = await prismock.post.findFirst(findPostPayload);

    const updatedComments = await prisma.comment.findMany(findCommentsPayload);
    const updatedMockedComments = await prismock.comment.findMany(findCommentsPayload);

    expect(updatedPost).toMatchObject(updatedMockedPost);
    expect(updatedComments).toMatchObject(updatedMockedComments);
  });

  it('Should disconnect many to many relationships', async () => {
    const connectPayload = {
      where: { id: 1 },
      data: {
        comments: {
          connect: [{ id: 1 }, { id: 2 }],
        },
      },
    };
    const disconnectPayload = {
      where: { id: 1 },
      data: {
        comments: {
          disconnect: [{ id: 2 }],
        },
      },
    };
    const findPostPayload = { where: { id: 1 }, include: { comments: true } };
    const findCommentsPayload = {
      where: {
        posts: {
          some: {
            id: 1,
          },
        },
      },
      include: { posts: true },
    };

    await prisma.post.update(connectPayload);
    await prismock.post.update(connectPayload);

    await prisma.post.update(disconnectPayload);
    await prismock.post.update(disconnectPayload);

    const updatedPost = await prisma.post.findFirst(findPostPayload);
    const updatedMockedPost = await prismock.post.findFirst(findPostPayload);

    const updatedComments = await prisma.comment.findMany(findCommentsPayload);
    const updatedMockedComments = await prismock.comment.findMany(findCommentsPayload);

    expect(updatedPost).toMatchObject(updatedMockedPost);
    expect(updatedComments).toMatchObject(updatedMockedComments);
  });
});
