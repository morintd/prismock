/* eslint-disable jest/no-conditional-expect */
import { Prisma, User, PrismaClient } from '@prisma/client';

import { formatEntries, resetDb, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.setTimeout(40000);

describe('findMany (match)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;
  let provider: string;

  beforeAll(async () => {
    await resetDb();

    const generator = await fetchGenerator();
    provider = getProvider(generator)!;
    generator.stop();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  describe('match', () => {
    const matchers: [string, Prisma.UserFindFirstArgs, User[]][] = [
      [
        'and/or',
        {
          where: {
            AND: [
              {
                OR: [{ email: { contains: '1', mode: 'insensitive' } }, { email: { contains: '3', mode: 'insensitive' } }],
              },
            ],
          },
        },
        [seededUsers[0], seededUsers[2]],
      ],
    ];

    matchers.forEach(([name, find, expected]) => {
      it(`Should match on ${name}`, async () => {
        if (!['mysql', 'sqlserver'].includes(provider)) {
          const realUsers = await prisma.user.findMany(find);

          const mockUsers = await prismock.user.findMany(find);

          expect(formatEntries(realUsers)).toEqual(formatEntries(expected));
          expect(formatEntries(mockUsers)).toEqual(formatEntries(expected));
        } else {
          // eslint-disable-next-line no-console
          console.log('[SKIPPED] Insensitive is not supported on the current db');
        }
      });
    });
  });
});
