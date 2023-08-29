import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, seededPosts, seededUsers, formatEntries, formatEntry } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('update (connect)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let realAuthor: User;
  let mockAuthor: User;

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
});
