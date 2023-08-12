import { PrismaClient /* , User */, User } from '@prisma/client';

import { resetDb, simulateSeed, seededPosts, seededUsers /* , formatEntries, formatEntry */ } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('update (connect - many)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  // let realAuthor1: User;
  let realAuthor2: User;

  // let mockAuthor1: User;
  let mockAuthor2: User;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    simulateSeed(prismock);

    // realAuthor1 = (await prisma.user.findFirst({ where: { email: seededUsers[0].email } }))!;
    realAuthor2 = (await prisma.user.findFirst({ where: { email: seededUsers[1].email } }))!;

    // mockAuthor1 = (await prismock.user.findFirst({ where: { email: seededUsers[0].email } }))!;
    mockAuthor2 = (await prismock.user.findFirst({ where: { email: seededUsers[1].email } }))!;
  });

  it('Should update with connect for many relation', async () => {
    const realPost = await prisma.post.update({
      where: {
        title: seededPosts[0].title,
      },
      data: {
        title: 'title-connected',
        author: {
          connect: {
            email: seededUsers[1].email,
          },
        },
      },
      select: {
        authorId: true,
        title: true,
      },
    });

    const mockPost = await prismock.post.update({
      where: {
        title: seededPosts[0].title,
      },
      data: {
        title: 'title-connected',
        author: {
          connect: {
            email: seededUsers[1].email,
          },
        },
      },
      select: {
        authorId: true,
        title: true,
      },
    });

    expect(realPost).toEqual({
      authorId: realAuthor2.id,
      title: 'title-connected',
    });

    expect(mockPost).toEqual({
      authorId: mockAuthor2.id,
      title: 'title-connected',
    });
  });

  // it('Should store connected', async () => {
  //   const stored = await prisma.post.findMany();
  //   const mockStored = prismock.getData().post;

  //   expect(formatEntries(stored.map(({ createdAt, imprint, ...post }) => post))).toEqual(
  //     formatEntries(seededPosts.map(({ createdAt, imprint, ...post }) => ({ ...post, authorId: realAuthor.id }))),
  //   );
  //   expect(formatEntries(mockStored.map(({ createdAt, imprint, ...post }) => post))).toEqual(
  //     formatEntries(seededPosts.map(({ createdAt, imprint, ...post }) => ({ ...post, authorId: mockAuthor.id }))),
  //   );
  // });
});
