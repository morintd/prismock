import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, buildUser, buildPost } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(20000);

describe('update (create)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);
  });

  beforeAll(async () => {
    realUser = await prisma.user.update({
      where: { id: 1 },
      data: {
        friends: 1,
        Post: {
          create: {
            title: 'nested',
          },
        },
      },
    });

    mockUser = await prismock.user.update({
      where: { id: 1 },
      data: {
        friends: 1,
        Post: {
          create: {
            title: 'nested',
          },
        },
      },
    });
  });

  it('Should return created', () => {
    const expected = buildUser(1, { friends: 1 });
    expect(realUser).toEqual(expected);
    expect(mockUser).toEqual(expected);
  });

  it('Should store created', async () => {
    const expected = [
      buildPost(1, { authorId: 1 }),
      buildPost(2, { authorId: 2 }),
      buildPost(3, { authorId: 1, title: 'nested' }),
    ].map(({ createdAt, imprint, ...post }) => post);

    const stored = await prisma.post.findMany();
    const mockStored = prismock.getData().post;

    expect(stored.map(({ createdAt, imprint, ...post }) => post)).toEqual(expected);
    expect(mockStored.map(({ createdAt, imprint, ...post }) => post)).toEqual(expected);
  });
});
