import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, buildUser, buildPost, formatEntry, formatEntries, seededUsers } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('update (create)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let realAuthor1: User;
  let realAuthor2: User;

  let mockAuthor1: User;
  let mockAuthor2: User;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);
  });

  beforeAll(async () => {
    realAuthor1 = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    realAuthor2 = (await prisma.user.findUnique({ where: { email: 'user2@company.com' } }))!;

    mockAuthor1 = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor2 = (await prismock.user.findUnique({ where: { email: 'user2@company.com' } }))!;

    realUser = await prisma.user.update({
      where: { email: seededUsers[0].email },
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
      where: { email: seededUsers[0].email },
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
    expect(formatEntry(realUser)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
  });

  it('Should store created', async () => {
    const expected = [
      buildPost(1, { authorId: seededUsers[0].id }),
      buildPost(2, { authorId: seededUsers[1].id }),
      buildPost(3, { authorId: seededUsers[0].id, title: 'nested' }),
    ].map(({ createdAt, imprint, ...post }) => post);

    const stored = await prisma.post.findMany();
    const mockStored = prismock.getData().post;

    expect(formatEntries(stored.map(({ createdAt, imprint, ...post }) => post))).toEqual(
      formatEntries([
        { ...expected[0], authorId: realAuthor1.id },
        { ...expected[1], authorId: realAuthor2.id },
        { ...expected[2], authorId: realAuthor1.id },
      ]),
    );
    expect(formatEntries(mockStored.map(({ createdAt, imprint, ...post }) => post))).toEqual(
      formatEntries([
        { ...expected[0], authorId: mockAuthor1.id },
        { ...expected[1], authorId: mockAuthor2.id },
        { ...expected[2], authorId: mockAuthor1.id },
      ]),
    );
  });
});
