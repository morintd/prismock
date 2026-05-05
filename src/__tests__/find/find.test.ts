import { Blog, Post, Prisma, User, PrismaClient } from '@prisma/client';
import { version as clientVersion } from '@prisma/client/package.json';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  buildPost,
  buildUser,
  formatEntries,
  formatEntry,
  generateId,
  isUUID,
  resetDb,
  seededBlogs,
  seededUsers,
  setupJsonTests,
  simulateSeed,
} from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.setTimeout(40000);

describe('find', () => {
  let provider: string;
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realAuthor: User;
  let mockAuthor: User;

  let realBlog: Blog;
  let mockBlog: Blog;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const generator = await fetchGenerator();
    provider = getProvider(generator)!;
    generator.stop();

    realAuthor = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;

    realBlog = (await prisma.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    mockBlog = (await prismock.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
  });

  describe('JSON filters', () => {
    const users: Array<User & { parameters: any }> = [];
    const cleanUpClients: Array<() => Promise<void>> = [];

    beforeAll(async () => {
      const userData = buildUser(4);
      for (const client of [prisma, prismock]) {
        const newUser = await client.user.create({ data: userData });
        const allUsers = await client.user.findMany({ orderBy: { id: 'asc' } });
        const clientUsers: number[] = [];

        for (const user of allUsers) {
          const id = user.id;

          const parameters = {
            address: { street: id },
            alias: [`User${id}.alias1`, `User${id}.alias2`, `User${id}.alias3`],
            name: `User${id} Lastname`,
            userNumber: id,
          };

          const updatedUser = await client.user.update({
            where: { id: user.id },
            data: {
              parameters: id >= 3 ? parameters : [parameters],
            },
          });

          users.push(updatedUser);
          clientUsers.push(user.id);
        }

        const cleanUp = async () => {
          await client.user.delete({ where: { id: newUser.id } });
          await client.user.updateMany({
            where: {
              id: {
                in: clientUsers,
              },
            },
            data: {
              parameters: {},
            },
          });
        };

        cleanUpClients.push(cleanUp);
      }
    });

    afterAll(async () => {
      for (const cleanUp of cleanUpClients) {
        await cleanUp();
      }
    });

    it('Should query JSON fields (equals)', async () => {
      const realUser = await prisma.user.findFirst({ where: { parameters: { equals: users[1].parameters } } });
      const mockUser = await prismock.user.findFirst({ where: { parameters: { equals: users[1].parameters } } });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[1]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[1]));
    });

    it('Should query JSON fields (not)', async () => {
      const realUser = await prisma.user.findFirst({ where: { parameters: { not: users[0].parameters } } });
      const mockUser = await prismock.user.findFirst({ where: { parameters: { not: users[0].parameters } } });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[1]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[1]));
    });

    it('Should query JSON fields (path)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['userNumber'], equals: 3 } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['userNumber'], equals: 3 } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should query JSON fields (string_contains)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_contains: 'User3' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_contains: 'User3' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should fail to query JSON fields (string_contains)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_contains: 'FooBar' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_contains: 'FooBar' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    it('Should fail to query JSON fields (string_contains, default mode)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_contains: 'user3' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_contains: 'user3' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    // The current used version of Prisma does not have the mode option yet.
    // TODO: Renable this test once Prisma is updated.
    it.skip('Should fail to query JSON fields (string_contains, explicit default mode)', async () => {
      const realUser = await prisma.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_contains: 'user3', mode: 'default' } },
      });
      const mockUser = await prismock.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_contains: 'user3', mode: 'default' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    // The current used version of Prisma does not have the mode option yet.
    // TODO: Renable this test once Prisma is updated.
    it.skip('Should query JSON fields (string_contains, insensitive mode)', async () => {
      const realUser = await prisma.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_contains: 'user3', mode: 'insensitive' } },
      });
      const mockUser = await prismock.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_contains: 'user3', mode: 'insensitive' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should query JSON fields (string_starts_with)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_starts_with: 'User3' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_starts_with: 'User3' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should fail to query JSON fields (string_starts_with)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_starts_with: 'Lastname' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_starts_with: 'Lastname' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    it('Should fail to query JSON fields (string_starts_with, default mode)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_starts_with: 'user3' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_starts_with: 'user3' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    // The current used version of Prisma does not have the mode option yet.
    // TODO: Renable this test once Prisma is updated.
    it.skip('Should fail to query JSON fields (string_starts_with, explicit default mode)', async () => {
      const realUser = await prisma.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_starts_with: 'user3', mode: 'default' } },
      });
      const mockUser = await prismock.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_starts_with: 'user3', mode: 'default' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    // The current used version of Prisma does not have the mode option yet.
    // TODO: Renable this test once Prisma is updated.
    it.skip('Should query JSON fields (string_starts_with, insensitive mode)', async () => {
      const realUser = await prisma.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_starts_with: 'user3', mode: 'insensitive' } },
      });
      const mockUser = await prismock.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_starts_with: 'user3', mode: 'insensitive' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should query JSON fields (string_ends_with)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_ends_with: '3 Lastname' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_ends_with: '3 Lastname' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should fail to query JSON fields (string_ends_with)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_ends_with: 'FooBar' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_ends_with: 'FooBar' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    it('Should fail to query JSON fields (string_ends_with, default mode)', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['name'], string_ends_with: '3 lastname' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['name'], string_ends_with: '3 lastname' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    // The current used version of Prisma does not have the mode option yet.
    // TODO: Renable this test once Prisma is updated.
    it.skip('Should fail to query JSON fields (string_ends_with, explicit default mode)', async () => {
      const realUser = await prisma.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_ends_with: '3 lastname', mode: 'default' } },
      });
      const mockUser = await prismock.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_ends_with: '3 lastname', mode: 'default' } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    // The current used version of Prisma does not have the mode option yet.
    // TODO: Renable this test once Prisma is updated.
    it.skip('Should query JSON fields (string_ends_with, insensitive mode)', async () => {
      const realUser = await prisma.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_ends_with: '3 lastname', mode: 'insensitive' } },
      });
      const mockUser = await prismock.user.findFirst({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        where: { parameters: { path: ['name'], string_ends_with: '3 lastname', mode: 'insensitive' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should query JSON fields (array_contains)', async () => {
      const realUser = await prisma.user.findFirst({ where: { parameters: { array_contains: [{ userNumber: 2 }] } } });
      const mockUser = await prismock.user.findFirst({ where: { parameters: { array_contains: [{ userNumber: 2 }] } } });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[1]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[1]));
    });

    it('Should fail to query JSON fields (array_starts_with object)', async () => {
      const param = { address: { street: 2 }, name: 'User2 Lastname', userNumber: 2 };
      const realUser = await prisma.user.findFirst({
        where: { parameters: { array_starts_with: [param] } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { array_starts_with: [param] } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    it('Should fail to query JSON fields (array_starts_with) partial object', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { array_starts_with: [{ userNumber: 2 }] } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { array_starts_with: [{ userNumber: 2 }] } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    it('Should query JSON fields (array_starts_with) primitives', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['alias'], array_starts_with: 'User3.alias1' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['alias'], array_starts_with: 'User3.alias1' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should fail to query JSON fields (array_ends_with object)', async () => {
      const param = { address: { street: 2 }, name: 'User2 Lastname', userNumber: 2 };

      const realUser = await prisma.user.findFirst({
        where: { parameters: { array_ends_with: [param] } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { array_ends_with: [param] } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    it('Should fail to query JSON fields (array_ends_with) partial object', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { array_ends_with: [{ userNumber: 2 }] } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { array_ends_with: [{ userNumber: 2 }] } },
      });

      expect(formatEntry(realUser)).toEqual(null);
      expect(formatEntry(mockUser)).toEqual(null);
    });

    it('Should query JSON fields (array_ends_with) primitives', async () => {
      const realUser = await prisma.user.findFirst({
        where: { parameters: { path: ['alias'], array_ends_with: 'User3.alias3' } },
      });
      const mockUser = await prismock.user.findFirst({
        where: { parameters: { path: ['alias'], array_ends_with: 'User3.alias3' } },
      });

      expect(formatEntry(realUser)).toEqual(formatEntry(users[2]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(users[2]));
    });

    it('Should handle multiple values (array_contains)', async () => {
      const realUser1 = await prisma.user.findFirst({
        where: { parameters: { array_contains: [{ userNumber: 3 }, { name: 'User3 Lastname' }] } },
      });
      const mockUser1 = await prismock.user.findFirst({
        where: { parameters: { array_contains: [{ userNumber: 3 }, { name: 'User3 Lastname' }] } },
      });

      const realUser2 = await prisma.user.findFirst({
        where: { parameters: { array_contains: [{ userNumber: 3 }, { name: 'User2 Lastname' }] } },
      });
      const mockUser2 = await prismock.user.findFirst({
        where: { parameters: { array_contains: [{ userNumber: 3 }, { name: 'User2 Lastname' }] } },
      });

      const realUser3 = await prisma.user.findMany({
        where: { parameters: { array_contains: [{ userNumber: 1 }, { name: 'User2 Lastname' }, { userNumber: 4 }] } },
      });
      const mockUser3 = await prismock.user.findMany({
        where: { parameters: { array_contains: [{ userNumber: 1 }, { name: 'User2 Lastname' }, { userNumber: 4 }] } },
      });

      const realUser4 = await prisma.user.findMany({
        where: {
          parameters: { array_contains: [{ userNumber: 1 }, { name: 'User2 Lastname' }, { address: { street: 4 } }] },
        },
      });
      const mockUser4 = await prismock.user.findMany({
        where: {
          parameters: { array_contains: [{ userNumber: 1 }, { name: 'User2 Lastname' }, { address: { street: 4 } }] },
        },
      });

      const realUser5 = await prisma.user.findMany({
        where: { parameters: { array_contains: [{ userNumber: 1 }, { userNumber: 2 }] } },
      });
      const mockUser5 = await prismock.user.findMany({
        where: { parameters: { array_contains: [{ userNumber: 1 }, { userNumber: 2 }] } },
      });

      expect(realUser1).toEqual(null);
      expect(realUser2).toEqual(null);
      expect(realUser3).toEqual([]);
      expect(realUser4).toEqual([]);
      expect(realUser5).toEqual([]);

      expect(mockUser1).toEqual(realUser1);
      expect(mockUser2).toEqual(realUser2);
      expect(mockUser3).toEqual(realUser3);
      expect(mockUser4).toEqual(realUser4);
      expect(mockUser5).toEqual(realUser5);
    });
  });

  // Tests adapted from:
  // https://github.com/demonsters/prisma-mock/blob/2faf33862e4147e4c262d6e37235837a5dc895a9/__tests__/json.test.ts
  describe('Prisma-mock', () => {
    let createElements: Array<{
      userId: number;
      value: string;
      e_id: number;
      json: Prisma.JsonValue;
    }> = [];
    let cleanUp: () => Promise<void>;

    beforeAll(async () => {
      [createElements, cleanUp] = await setupJsonTests([prisma, prismock]);
    });

    afterAll(async () => {
      await cleanUp();
    });

    it('simple use case', () => {
      expect(createElements[0].json).toEqual([
        {
          name: 'Bob the dog',
        },
        {
          name: 'Claudine the cat',
        },
      ]);
      expect(createElements[1].json).toEqual([
        {
          name: 'Bob the dog',
        },
        {
          name: 'Claudine the cat',
        },
      ]);
    });

    describe('Filter on exact field value', () => {
      test('equals', async () => {
        const json = [{ name: 'Bob the dog' }, { name: 'Claudine the cat' }];

        const realGetUsers = await prisma.element.findMany({
          where: {
            json: {
              equals: json,
            },
          },
        });
        const mockGetUsers = await prismock.element.findMany({
          where: {
            json: {
              equals: json,
            },
          },
        });
        expect(realGetUsers).toEqual([
          {
            e_id: 5,
            json: [
              {
                name: 'Bob the dog',
              },
              {
                name: 'Claudine the cat',
              },
            ],
            userId: 5,
            value: '5',
          },
        ]);
        expect(mockGetUsers).toEqual(realGetUsers);
      });

      test('not', async () => {
        const json = [{ name: 'Bob the dog' }, { name: 'Claudine the cat' }];

        const realGetUsers = await prisma.element.findMany({
          where: {
            json: {
              not: json,
            },
          },
        });
        const realAll = await prisma.element.findMany({
          where: {
            e_id: {
              not: createElements[0].e_id,
            },
            json: {
              not: Prisma.DbNull,
            },
          },
        });

        const mockGetUsers = await prismock.element.findMany({
          where: {
            json: {
              not: json,
            },
          },
        });
        const mockAll = await prismock.element.findMany({
          where: {
            e_id: {
              not: createElements[1].e_id,
            },
            json: {
              not: Prisma.DbNull,
            },
          },
        });

        expect(realGetUsers).toEqual(realAll);
        expect(mockGetUsers).toEqual(mockAll);
        expect(mockGetUsers).toEqual(realGetUsers);
      });
    });

    describe('Filter on nested object property', () => {
      test('path', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              path: ['pet2', 'petName'],
              equals: 'Sunny',
            },
          },
        });

        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              path: ['pet2', 'petName'],
              equals: 'Sunny',
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 4,
            json: {
              pet1: {
                petName: 'Claudine',
                petType: 'House cat',
              },
              pet2: {
                features: {
                  eyeColor: 'Brown',
                  furColor: 'White and black',
                },
                petName: 'Sunny',
                petType: 'Gerbil',
              },
            },
            userId: 5,
            value: '4',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });

      test('string_contains', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              path: ['pet1', 'petType'],
              string_contains: 'cat',
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              path: ['pet1', 'petType'],
              string_contains: 'cat',
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 4,
            json: {
              pet1: {
                petName: 'Claudine',
                petType: 'House cat',
              },
              pet2: {
                features: {
                  eyeColor: 'Brown',
                  furColor: 'White and black',
                },
                petName: 'Sunny',
                petType: 'Gerbil',
              },
            },
            userId: 5,
            value: '4',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });

      test('string_starts_with', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              path: ['pet1', 'petType'],
              string_starts_with: 'House',
            },
          },
        });

        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              path: ['pet1', 'petType'],
              string_starts_with: 'House',
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 4,
            json: {
              pet1: {
                petName: 'Claudine',
                petType: 'House cat',
              },
              pet2: {
                features: {
                  eyeColor: 'Brown',
                  furColor: 'White and black',
                },
                petName: 'Sunny',
                petType: 'Gerbil',
              },
            },
            userId: 5,
            value: '4',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });

      test('string_ends_with', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              path: ['pet1', 'petType'],
              string_ends_with: 'cat',
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              path: ['pet1', 'petType'],
              string_ends_with: 'cat',
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 4,
            json: {
              pet1: {
                petName: 'Claudine',
                petType: 'House cat',
              },
              pet2: {
                features: {
                  eyeColor: 'Brown',
                  furColor: 'White and black',
                },
                petName: 'Sunny',
                petType: 'Gerbil',
              },
            },
            userId: 5,
            value: '4',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });
    });

    describe('Filtering on an array value', () => {
      test('array_contains', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              array_contains: [
                {
                  name: 'Bob the dog',
                },
              ],
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              array_contains: [
                {
                  name: 'Bob the dog',
                },
              ],
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 5,
            json: [
              {
                name: 'Bob the dog',
              },
              {
                name: 'Claudine the cat',
              },
            ],
            userId: 5,
            value: '5',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });
    });

    describe('Filtering on nested array value', () => {
      test(')ne', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              path: ['cats', 'fostering'],
              array_contains: ['Fido'],
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              path: ['cats', 'fostering'],
              array_contains: ['Fido'],
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 6,
            json: {
              cats: {
                fostering: ['Fido'],
                owned: ['Bob', 'Sunny'],
              },
              dogs: {
                fostering: ['Prince', 'Empress'],
                owned: ['Ella'],
              },
            },
            userId: 5,
            value: '6',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });

      test('Two with no match', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              path: ['cats', 'fostering'],
              array_contains: ['Fido', 'Bob'],
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              path: ['cats', 'fostering'],
              array_contains: ['Fido', 'Bob'],
            },
          },
        });
        expect(realElement).toEqual([]);
        expect(mockElement).toEqual(realElement);
      });

      test('Two with match', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              path: ['cats', 'fostering'],
              array_contains: ['Bill', 'Bob'],
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              path: ['cats', 'fostering'],
              array_contains: ['Bill', 'Bob'],
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 8,
            json: {
              cats: {
                fostering: ['Bob', 'Bill'],
                owned: ['John'],
              },
            },
            userId: 5,
            value: '8',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });
    });

    describe('Filtering on object key value inside array (MySQL only)', () => {
      // test.skip('array_contains', async () => {
      //   const element = await prisma.element.findMany({
      //     where: {
      //       json: {
      //         path: '$[*].name',
      //         array_contains: 'Bob the dog',
      //       },
      //     },
      //   });
      //   expect(element).toEqual([]);
      // });
    });

    describe('Using null Values', () => {
      test('JsonNull', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              equals: Prisma.JsonNull,
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              equals: Prisma.JsonNull,
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 9,
            json: null,
            userId: 5,
            value: '9',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });

      test('DbNull', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              equals: Prisma.DbNull,
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              equals: Prisma.DbNull,
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 10,
            json: null,
            userId: 5,
            value: '10',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });

      test('AnyNull', async () => {
        const realElement = await prisma.element.findMany({
          where: {
            json: {
              equals: Prisma.AnyNull,
            },
          },
        });
        const mockElement = await prismock.element.findMany({
          where: {
            json: {
              equals: Prisma.AnyNull,
            },
          },
        });
        expect(realElement).toEqual([
          {
            e_id: 9,
            json: null,
            userId: 5,
            value: '9',
          },
          {
            e_id: 10,
            json: null,
            userId: 5,
            value: '10',
          },
        ]);
        expect(mockElement).toEqual(realElement);
      });
    });
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

    it('Should support querying with bigint field', async () => {
      const realUser = (await prisma.user.findFirst({
        where: { money: BigInt(0) },
      })) as User;

      const mockUser = (await prismock.user.findFirst({
        where: { money: BigInt(0) },
      })) as User;

      expect(formatEntry(realUser)).toEqual(formatEntry(seededUsers[0]));
      expect(formatEntry(mockUser)).toEqual(formatEntry(seededUsers[0]));
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

    it('Should return item with orderBy', async () => {
      const expected = { warnings: 10 };

      const realUser = (await prisma.user.findFirst({
        orderBy: {
          warnings: 'desc',
        },
        select: {
          warnings: true,
        },
      })) as User;

      const mockUser = (await prismock.user.findFirst({
        orderBy: {
          warnings: 'desc',
        },
        select: {
          warnings: true,
        },
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
      expect(typeof realUserPostCreatedAt.getTime()).toBe('number');
      expect(isUUID(expectedRealUserPostImprint)).toBe(true);

      expect(formatEntry(mockUser)).toEqual(formatEntry(seededUsers[0]));
      expect(formatEntry(expectedMockUserPost)).toEqual(
        formatEntry({ ...expectedPost, authorId: mockAuthor.id, blogId: mockBlog.id }),
      );
      expect(typeof mockUserPostCreatedAt.getTime()).toBe('number');
      expect(isUUID(expectedMockUserImprint)).toBe(true);
    });

    it('Should not return item with includes false', async () => {
      const { posts: realUserPost } = (await prisma.user.findFirst({
        where: { email: 'user1@company.com' },
        include: { posts: false },
      })) as User & { posts: Post[] };

      const { posts: mockUserPost } = (await prismock.user.findFirst({
        where: { email: 'user1@company.com' },
        include: { posts: false },
      })) as User & { posts: Post[] };

      expect(realUserPost).toBeUndefined();
      expect(mockUserPost).toBeUndefined();
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
        ['not', { where: { NOT: { email: { startsWith: 'user2' } } } }, seededUsers[0]],
      ];

      // Adding case-sentive test but ignoring db where it's not a feature (case-insensitive by default)
      // https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting#case-insensitive-filtering

      const insensitiveMatchers: [string, Prisma.UserFindFirstArgs, User][] = [
        [
          'equals',
          { where: { email: { equals: 'USER2@COMPANY.com', mode: 'insensitive' } } } as Prisma.UserFindFirstArgs,
          user,
        ],
        ['startsWith', { where: { email: { startsWith: 'USER2', mode: 'insensitive' } } } as Prisma.UserFindFirstArgs, user],
        [
          'endsWith',
          { where: { email: { endsWith: '2@COMPANY.COM', mode: 'insensitive' } } } as Prisma.UserFindFirstArgs,
          user,
        ],
        ['contains', { where: { email: { contains: '2@COMPANY', mode: 'insensitive' } } } as Prisma.UserFindFirstArgs, user],
        ['in', { where: { email: { in: ['USER2@COMPANY.COM'], mode: 'insensitive' } } } as Prisma.UserFindFirstArgs, user],
        [
          'and',
          {
            where: { AND: [{ warnings: { gt: 0 } }, { email: { startsWith: 'USER3', mode: 'insensitive' } }] },
          } as Prisma.UserFindFirstArgs,
          seededUsers[2],
        ],
      ];

      matchers.forEach(([name, find, expected]) => {
        it(`Should match on ${name}`, async () => {
          const realUser = (await prisma.user.findFirst(find)) as User;

          const mockUser = (await prismock.user.findFirst(find)) as User;

          expect(formatEntry(realUser)).toEqual(formatEntry(expected));
          expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
        });
      });

      insensitiveMatchers.forEach(([name, find, expected]) => {
        it(`Should match on ${name} [insensitive]`, async () => {
          if (!['mysql', 'sqlserver'].includes(provider)) {
            const realUser = (await prisma.user.findFirst(find)) as User;

            const mockUser = (await prismock.user.findFirst(find)) as User;

            // eslint-disable-next-line jest/no-conditional-expect
            expect(formatEntry(realUser)).toEqual(formatEntry(expected));
            // eslint-disable-next-line jest/no-conditional-expect
            expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
          } else {
            // eslint-disable-next-line no-console
            console.log('[SKIPPED] Insensitive is not supported on the current db');
          }
        });
      });

      it(`Should match on is (object)`, async () => {
        const realBlogs = await prisma.blog.findMany({
          where: { author: { is: { email: seededUsers[0].email } } },
          select: { title: true },
        });
        const mockBlogs = await prismock.blog.findMany({
          where: { author: { is: { email: seededUsers[0].email } } },
          select: { title: true },
        });

        expect(realBlogs).toEqual(mockBlogs);
      });

      it(`Should match on is (null)`, async () => {
        const realBlogs = await prisma.blog.findMany({
          where: { author: { is: null } },
          select: { title: true },
        });
        const mockBlogs = await prismock.blog.findMany({
          where: { author: { is: null } },
          select: { title: true },
        });

        expect(realBlogs).toEqual(mockBlogs);
      });

      it(`Should match on null`, async () => {
        const realBlogs = await prisma.blog.findMany({
          where: { author: null },
          select: { title: true },
        });
        const mockBlogs = await prismock.blog.findMany({
          where: { author: null },
          select: { title: true },
        });

        expect(realBlogs).toEqual(mockBlogs);
      });
    });

    it('should correctly query on Datetime type field', async () => {
      const realPost1 = await prisma.post.findFirst({
        where: {
          createdAt: {
            gt: new Date('2021-01-01T00:00:00.000Z'),
          },
        },
      });

      const realPost1Variation = await prisma.post.findFirst({
        where: {
          createdAt: {
            gt: '2021-01-01T00:00:00.000Z',
          },
        },
      });

      const realPost2 = await prisma.post.findFirst({
        where: {
          createdAt: {
            lt: new Date('2021-01-01T00:00:00.000Z'),
          },
        },
      });

      const realPost2Variation = await prisma.post.findFirst({
        where: {
          createdAt: {
            lt: new Date('2021-01-01T00:00:00.000Z'),
          },
        },
      });

      const mockPost1 = await prismock.post.findFirst({
        where: {
          createdAt: {
            gt: new Date('2021-01-01T00:00:00.000Z'),
          },
        },
      });

      const mockPost1Variation = await prismock.post.findFirst({
        where: {
          createdAt: {
            gt: '2021-01-01T00:00:00.000Z',
          },
        },
      })!;

      const mockPost2 = await prismock.post.findFirst({
        where: {
          createdAt: {
            lt: new Date('2021-01-01T00:00:00.000Z'),
          },
        },
      })!;

      const mockPost2Variation = await prismock.post.findFirst({
        where: {
          createdAt: {
            lt: new Date('2021-01-01T00:00:00.000Z'),
          },
        },
      });

      expect(formatEntry(realPost1)).toEqual(
        expect.objectContaining(
          formatEntry({
            id: generateId(1),
            title: 'title1',
            imprint: '3e937a1f-cd50-422f-bd0d-624d9ccd441d',
            authorId: realAuthor.id,
            blogId: realBlog.id,
          }),
        ),
      );

      expect(formatEntry(realPost1Variation)).toEqual(
        expect.objectContaining(
          formatEntry({
            id: generateId(1),
            title: 'title1',
            imprint: '3e937a1f-cd50-422f-bd0d-624d9ccd441d',
            authorId: realAuthor.id,
            blogId: realBlog.id,
          }),
        ),
      );

      expect(formatEntry(realPost2)).toBeNull();
      expect(formatEntry(realPost2Variation)).toBeNull();

      expect(formatEntry(mockPost1)).toEqual(
        expect.objectContaining(
          formatEntry({
            id: generateId(1),
            title: 'title1',
            imprint: '3e937a1f-cd50-422f-bd0d-624d9ccd441d',
            authorId: mockAuthor.id,
            blogId: mockBlog.id,
          }),
        ),
      );

      expect(formatEntry(mockPost1Variation)).toEqual(
        expect.objectContaining(
          formatEntry({
            id: generateId(1),
            title: 'title1',
            imprint: '3e937a1f-cd50-422f-bd0d-624d9ccd441d',
            authorId: mockAuthor.id,
            blogId: mockBlog.id,
          }),
        ),
      );

      expect(formatEntry(mockPost2)).toBeNull();
      expect(formatEntry(mockPost2Variation)).toBeNull();
    });

    it('Should return item without being modified', async () => {
      let realUser = await prisma.user.findFirst({
        where: { email: seededUsers[0].email },
      });
      let mockUser = await prismock.user.findFirst({
        where: { email: seededUsers[0].email },
      });

      // @ts-expect-error password is required
      delete realUser.password;
      // @ts-expect-error password is required
      delete mockUser.password;

      realUser = await prisma.user.findFirst({
        where: { email: seededUsers[0].email },
      });

      mockUser = await prismock.user.findFirst({
        where: { email: seededUsers[0].email },
      });

      expect(realUser?.password).toEqual(mockUser?.password);
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

    it('Should return item without being modified', async () => {
      let realUser = await prisma.user.findMany({
        where: { email: seededUsers[0].email },
      });
      let mockUser = await prismock.user.findMany({
        where: { email: seededUsers[0].email },
      });

      // @ts-expect-error password is required
      delete realUser[0].password;
      // @ts-expect-error password is required
      delete mockUser[0].password;

      realUser = await prisma.user.findMany({
        where: { email: seededUsers[0].email },
      });

      mockUser = await prismock.user.findMany({
        where: { email: seededUsers[0].email },
      });

      expect(realUser[0].password).toEqual(mockUser[0].password);
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
      await expect(() => prismock.user.findFirstOrThrow({ where: { warnings: -1 } })).rejects.toEqual(
        new PrismaClientKnownRequestError('No User found', {
          code: 'P2025',
          clientVersion,
        }),
      );
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
      await expect(() => prismock.user.findUniqueOrThrow({ where: { email: 'does-not-exist' } })).rejects.toEqual(
        new PrismaClientKnownRequestError('No User found', {
          code: 'P2025',
          clientVersion,
        }),
      );
    });
  });
});
