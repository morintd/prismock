import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, seededPosts, seededUsers } from '../../testing';
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
      where: { id: 1 },
      data: { Post: { connect: { id: 2 } } },
    });

    mockUser = await prismock.user.update({
      where: { id: 1 },
      data: { Post: { connect: { id: 2 } } },
    });
  });

  it('Should return connected', () => {
    const expected = seededUsers[0];
    expect(realUser).toEqual(expected);
    expect(mockUser).toEqual(expected);
  });

  it('Should store connected', async () => {
    const expected = seededPosts.map(({ createdAt, imprint, ...post }) => ({ ...post, authorId: 1 }));
    const stored = await prisma.post.findMany();
    const mockStored = prismock.getData().post;

    expect(stored.map(({ createdAt, imprint, ...post }) => post)).toEqual(expected);
    expect(mockStored.map(({ createdAt, imprint, ...post }) => post)).toEqual(expected);
  });
});
