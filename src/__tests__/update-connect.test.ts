import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, seededPosts, seededUsers, formatEntries, formatEntry } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(20000);

describe('update (connect)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    realUser = await prisma.user.update({
      where: { id: seededUsers[0].id },
      data: { Post: { connect: { id: seededPosts[1].id } } },
    });

    mockUser = await prismock.user.update({
      where: { id: seededUsers[0].id },
      data: { Post: { connect: { id: seededPosts[1].id } } },
    });
  });

  it('Should return connected', () => {
    const expected = seededUsers[0];
    expect(formatEntry(realUser)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
  });

  it('Should store connected', async () => {
    const expected = seededPosts.map(({ createdAt, imprint, ...post }) => ({ ...post, authorId: seededUsers[0].id }));
    const stored = await prisma.post.findMany();
    const mockStored = prismock.getData().post;

    expect(formatEntries(stored.map(({ createdAt, imprint, ...post }) => post))).toEqual(formatEntries(expected));
    expect(formatEntries(mockStored.map(({ createdAt, imprint, ...post }) => post))).toEqual(formatEntries(expected));
  });
});
