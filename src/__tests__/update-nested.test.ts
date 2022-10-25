import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, buildUser, buildPost, formatEntry } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(20000);

describe('update (nested)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  const date = new Date();

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);
  });

  beforeAll(async () => {
    await prisma.post.update({ where: { id: 2 }, data: { authorId: 1 } });
    await prismock.post.update({ where: { id: 2 }, data: { authorId: 1 } });

    realUser = await prisma.user.update({
      where: { id: 1 },
      data: {
        friends: 1,
        Post: {
          update: {
            where: {
              title: 'title1',
            },
            data: {
              createdAt: date,
            },
          },
        },
      },
    });

    mockUser = await prismock.user.update({
      where: { id: 1 },
      data: {
        friends: 1,
        Post: {
          update: {
            where: {
              title: 'title1',
            },
            data: {
              createdAt: date,
            },
          },
        },
      },
    });
  });

  it('Should return updated', () => {
    const expected = buildUser(1, { friends: 1 });
    expect(formatEntry(realUser)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
  });

  it('Should store updated', async () => {
    const expected = [buildPost(1, { createdAt: date, authorId: 1 }), buildPost(2, { authorId: 1 })].map(
      ({ imprint, ...post }) => post,
    );

    const stored = (await prisma.post.findMany()).sort((a, b) => a.id - b.id).map(({ imprint, ...post }) => post);
    const mockStored = prismock.getData().post.map(({ imprint, ...post }) => post);

    expect(formatEntry(stored[0])).toEqual(formatEntry(expected[0]));
    expect(formatEntry(mockStored[0])).toEqual(formatEntry(expected[0]));

    const { createdAt, ...post } = expected[1];
    const { createdAt: realCreatedAt, ...realPost } = stored[1];
    const { createdAt: mockCreatedAt, ...mockPost } = mockStored[1];

    expect(formatEntry(realPost)).toEqual(formatEntry(post));
    expect(formatEntry(mockPost)).toEqual(formatEntry(post));
    expect(realCreatedAt).not.toEqual(createdAt);
    expect(mockCreatedAt).not.toEqual(createdAt);
  });
});
