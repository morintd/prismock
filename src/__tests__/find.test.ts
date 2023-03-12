import { Blog, Post, Prisma, PrismaClient, User } from '@prisma/client';

import {
  buildPost,
  formatEntries,
  formatEntry,
  generateId,
  isUUID,
  resetDb,
  seededBlogs,
  seededUsers,
  simulateSeed,
} from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('find', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realAuthor: User;
  let mockAuthor: User;

  let realBlog: Blog;
  let mockBlog: Blog;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    realAuthor = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;

    realBlog = (await prisma.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    mockBlog = (await prismock.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
  });

  describe('findFirst', () => {
    it('Should return first corresponding item', async () => {
      const realUser = (await prisma.user.findFirst({
        where: { email: 'user2@company.com' },
      })) as User;

      const mockUser = (await prismock.user.findFirst({
        where: { email: 'user2@company.com' },
      })) as User;

      expect(formatEntry(realUser)).toEqual(formatEntry(seededUsers[1]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(seededUsers[1]));
    });

    it("Should return null if doesn't exist", async () => {
      const realUser = await prisma.user.findFirst({
        where: { email: 'user0@company.com' },
      });

      const mockUser = await prismock.user.findFirst({
        where: { email: 'user0@company.com' },
      });

      expect(realUser).toBeNull();
      expect(mockUser).toBeNull();
    });

    it('Should return item with selected', async () => {
      const expected = { id: generateId(2), email: 'user2@company.com' };

      const realUser = (await prisma.user.findFirst({
        where: { email: 'user2@company.com' },
        select: { id: true, email: true },
      })) as User;

      const mockUser = (await prismock.user.findFirst({
        where: { email: 'user2@company.com' },
        select: { id: true, email: true },
      })) as User;

      expect(formatEntry(realUser)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
    });

    it('Should return item with includes', async () => {
      const {
        createdAt: expectedPostCreatedAt,
        imprint: expectedImprint,
        ...expectedPost
      } = buildPost(1, { authorId: seededUsers[0].id, blogId: seededBlogs[0].id });

      const { posts: realUserPost, ...realUser } = (await prisma.user.findFirst({
        where: { email: 'user1@company.com' },
        include: { posts: true },
      })) as User & { posts: Post[] };

      const { posts: mockUserPost, ...mockUser } = (await prismock.user.findFirst({
        where: { email: 'user1@company.com' },
        include: { posts: true },
      })) as User & { posts: Post[] };

      expect(realUserPost.length).toBe(1);
      expect(mockUserPost.length).toBe(1);

      const {
        createdAt: realUserPostCreatedAt,
        imprint: expectedRealUserPostImprint,
        ...expectedRealUserPost
      } = realUserPost[0];
      const {
        createdAt: mockUserPostCreatedAt,
        imprint: expectedMockUserImprint,
        ...expectedMockUserPost
      } = mockUserPost[0];

      expect(formatEntry(realUser)).toEqual(formatEntry(seededUsers[0]));
      expect(formatEntry(expectedRealUserPost)).toEqual(
        formatEntry({ ...expectedPost, authorId: realAuthor.id, blogId: realBlog.id }),
      );
      expect(realUserPostCreatedAt).toBeInstanceOf(Date);
      expect(isUUID(expectedRealUserPostImprint)).toBe(true);

      expect(formatEntry(mockUser)).toEqual(formatEntry(seededUsers[0]));
      expect(formatEntry(expectedMockUserPost)).toEqual(
        formatEntry({ ...expectedPost, authorId: mockAuthor.id, blogId: mockBlog.id }),
      );
      expect(mockUserPostCreatedAt).toBeInstanceOf(Date);
      expect(isUUID(expectedMockUserImprint)).toBe(true);
    });

    describe('match', () => {
      const user = seededUsers[1];
      const matchers: [string, Prisma.UserFindFirstArgs, User][] = [
        ['empty', {}, seededUsers[0]],
        ['empty where', { where: {} }, seededUsers[0]],
        ['equals', { where: { email: { equals: 'user2@company.com' } } } as Prisma.UserFindFirstArgs, user],
        ['startsWith', { where: { email: { startsWith: 'user2' } } }, user],
        ['endsWith', { where: { email: { endsWith: '2@company.com' } } }, user],
        ['contains', { where: { email: { contains: '2@company' } } }, user],
        ['gt', { where: { warnings: { gt: 5 } } }, seededUsers[2]],
        ['gt/lt', { where: { warnings: { gt: 0, lt: 10 } } }, user],
        ['gte/lte (gte)', { where: { warnings: { gte: 5, lte: 9 } } }, user],
        ['gte/lte (lte)', { where: { warnings: { gte: 1, lte: 5 } } }, user],
        ['in', { where: { email: { in: ['user2@company.com'] } } }, user],
        ['not', { where: { warnings: { not: 0 } } }, user],
        ['notIn', { where: { warnings: { notIn: [0, 5] } } }, seededUsers[2]],
        ['and', { where: { AND: [{ warnings: { gt: 0 } }, { email: { startsWith: 'user3' } }] } }, seededUsers[2]],
        ['or', { where: { OR: [{ warnings: { gt: 10 } }, { email: { startsWith: 'user3' } }] } }, seededUsers[2]],
        ['not', { where: { NOT: [{ warnings: { lt: 5 } }, { email: { startsWith: 'user2' } }] } }, seededUsers[2]],
      ];

      matchers.forEach(([name, find, expected]) => {
        it(`Should match on ${name}`, async () => {
          const realUser = (await prisma.user.findFirst(find)) as User;

          const mockUser = (await prismock.user.findFirst(find)) as User;

          expect(formatEntry(realUser)).toEqual(formatEntry(expected));
          expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
        });
      });
    });
  });

  describe('findMany', () => {
    it('Should return corresponding items', async () => {
      const expected = seededUsers.slice(1);
      const realUsers = await prisma.user.findMany({
        where: { warnings: { gt: 0 } },
      });

      const mockUsers = await prismock.user.findMany({
        where: { warnings: { gt: 0 } },
      });

      expect(formatEntries(realUsers)).toEqual(formatEntries(expected));
      expect(formatEntries(mockUsers)).toEqual(formatEntries(expected));
    });

    it('Should return corresponding items with skip', async () => {
      const expected = [seededUsers[1], seededUsers[2]];
      const realUsers = await prisma.user.findMany({
        where: {},
        skip: 1,
      });

      const mockUsers = await prismock.user.findMany({
        where: {},
        skip: 1,
      });

      expect(formatEntries(realUsers)).toEqual(formatEntries(expected));
      expect(formatEntries(mockUsers)).toEqual(formatEntries(expected));
    });

    it('Should return corresponding items with take', async () => {
      const expected = [seededUsers[0], seededUsers[1]];
      const realUsers = await prisma.user.findMany({
        where: {},
        take: 2,
      });

      const mockUsers = await prismock.user.findMany({
        where: {},
        take: 2,
      });

      expect(formatEntries(realUsers)).toEqual(formatEntries(expected));
      expect(formatEntries(mockUsers)).toEqual(formatEntries(expected));
    });

    it('Should return corresponding items with take and skip', async () => {
      const expected = [seededUsers[1], seededUsers[2]];
      const realUsers = await prisma.user.findMany({
        where: {},
        take: 2,
        skip: 1,
      });

      const mockUsers = await prismock.user.findMany({
        where: {},
        take: 2,
        skip: 1,
      });

      expect(formatEntries(realUsers)).toEqual(formatEntries(expected));
      expect(formatEntries(mockUsers)).toEqual(formatEntries(expected));
    });

    it("Should return empty list if doesn't exist", async () => {
      const realUser = await prisma.user.findMany({
        where: { email: 'user0@company.com' },
      });

      const mockUser = await prismock.user.findMany({
        where: { email: 'user0@company.com' },
      });

      expect(realUser).toEqual([]);
      expect(mockUser).toEqual([]);
    });

    it('Should return item with selected', async () => {
      const expected = seededUsers.slice(1).map(({ id, email }) => ({ id, email }));

      const realUsers = await prisma.user.findMany({
        where: { warnings: { gt: 0 } },
        select: { id: true, email: true },
      });

      const mockUsers = await prismock.user.findMany({
        where: { warnings: { gt: 0 } },
        select: { id: true, email: true },
      });

      expect(formatEntries(realUsers)).toEqual(formatEntries(expected));
      expect(formatEntries(mockUsers)).toEqual(formatEntries(expected));
    });

    it('Should return disctinct', async () => {
      const expected = [{ warnings: 0 }, { warnings: 5 }, { warnings: 10 }];

      const realUsers = await prisma.user.findMany({
        distinct: ['warnings'],
        select: {
          warnings: true,
        },
      });

      const mockUsers = await prismock.user.findMany({
        distinct: ['warnings'],
        select: {
          warnings: true,
        },
      });

      expect(formatEntries(realUsers)).toEqual(formatEntries(expected));
      expect(formatEntries(mockUsers)).toEqual(formatEntries(expected));
    });
  });

  describe('findUnique', () => {
    it('Should return first corresponding item', async () => {
      const realUser = (await prisma.user.findUnique({
        where: { email: 'user2@company.com' },
      })) as User;

      const mockUser = (await prismock.user.findUnique({
        where: { email: 'user2@company.com' },
      })) as User;

      expect(formatEntry(realUser)).toEqual(formatEntry(seededUsers[1]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(seededUsers[1]));
    });

    it("Should return null if doesn't exist", async () => {
      const realUser = await prisma.user.findUnique({
        where: { email: 'user0@company.com' },
      });

      const mockUser = await prismock.user.findUnique({
        where: { email: 'user0@company.com' },
      });

      expect(realUser).toBeNull();
      expect(mockUser).toBeNull();
    });
  });

  describe('findFirstOrThrow', () => {
    it('Should return first corresponding item', async () => {
      const realUser = await prisma.user.findFirstOrThrow({
        where: { email: 'user2@company.com' },
      });

      const mockUser = await prismock.user.findFirstOrThrow({
        where: { email: 'user2@company.com' },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(seededUsers[1]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(seededUsers[1]));
    });

    it("Should throw if doesn't exist", async () => {
      await expect(() => prisma.user.findFirstOrThrow({ where: { warnings: -1 } })).rejects.toThrow();
      await expect(() => prismock.user.findFirstOrThrow({ where: { warnings: -1 } })).rejects.toThrow();
    });
  });

  describe('findUniqueOrThrow', () => {
    it('Should return first corresponding item', async () => {
      const realUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'user2@company.com' },
      });

      const mockUser = await prismock.user.findUniqueOrThrow({
        where: { email: 'user2@company.com' },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(seededUsers[1]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(seededUsers[1]));
    });

    it("Should throw if doesn't exist", async () => {
      await expect(() => prisma.user.findUniqueOrThrow({ where: { email: 'does-not-exist' } })).rejects.toThrow();
      await expect(() => prismock.user.findUniqueOrThrow({ where: { email: 'does-not-exist' } })).rejects.toThrow();
    });
  });
});
