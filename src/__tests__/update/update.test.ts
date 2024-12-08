/* eslint-disable jest/no-conditional-expect */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { PrismaClient, Service } from '@prisma/client';

import {
  buildUser,
  formatEntries,
  formatEntry,
  resetDb,
  seededReactions,
  seededServices,
  seededUsers,
  simulateSeed,
} from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { Item } from '../../lib/delegate';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.setTimeout(40000);

describe('update', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let provider: string;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const generator = await fetchGenerator();
    provider = getProvider(generator);
    generator.stop();
  });

  describe('Update', () => {
    let realUpdate: Item;
    let mockUpdate: Item;

    beforeAll(async () => {
      realUpdate = await prisma.user.update({
        where: { email: seededUsers[0].email },
        data: { warnings: 99, email: undefined },
      });
      mockUpdate = await prismock.user.update({
        where: { email: seededUsers[0].email },
        data: { warnings: 99, email: undefined },
      });
    });

    it('Should return updated item', () => {
      const expected = buildUser(1, { warnings: 99 });

      expect(formatEntry(realUpdate)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUpdate)).toEqual(formatEntry(expected));
    });

    it('Should update stored data', async () => {
      const expectedStore = [buildUser(1, { warnings: 99 }), seededUsers[1], seededUsers[2]];
      const mockStored = prismock.getData().user;
      const stored = (await prisma.user.findMany()).sort((a, b) => a.id.toString().localeCompare(b.id.toString()));

      expect(formatEntries(stored)).toEqual(formatEntries(expectedStore));
      expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStore));
    });
  });

  describe('Update (push)', () => {
    if (['mongodb', 'postgresql'].includes(provider)) {
      let realService: Service;
      let mockService: Service;

      beforeAll(async () => {
        const seededService = seededServices[0];

        realService = (await prisma.service.findFirst({ where: { name: seededService.name } }))!;
        mockService = (await prismock.service.findFirst({ where: { name: seededService.name } }))!;

        await prisma.service.updateMany({
          where: { name: seededService.name },
          data: {
            tags: {
              push: ['tag1', 'tag2'],
            },
          },
        });
        prismock.service.updateMany({
          where: { name: seededService.name },
          data: {
            tags: {
              push: ['tag1', 'tag2'],
            },
          },
        });
      });

      it('Should update stored data', async () => {
        const mockStored = await prismock.service.findMany({ select: { name: true, tags: true, userId: true } });
        const stored = await prisma.service.findMany({ select: { name: true, tags: true, userId: true } });

        expect(stored).toEqual([
          {
            name: realService.name,
            tags: ['tag1', 'tag2'],
            userId: realService.userId,
          },
        ]);

        expect(mockStored).toEqual([
          {
            name: mockService.name,
            tags: ['tag1', 'tag2'],
            userId: mockService.userId,
          },
        ]);
      });
    }
  });

  describe('Update using compound id with default name', () => {
    const updatedReaction = seededReactions[0];
    const untouchedReaction = seededReactions[1];
    const expectedNewValue = 100;

    beforeAll(async () => {
      if (provider !== 'mongodb') {
        await prisma.reaction.update({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
          data: {
            value: expectedNewValue,
          },
        });
        await prismock.reaction.update({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
          data: {
            value: expectedNewValue,
          },
        });
      }
    });

    it('Should update expected entry', async () => {
      if (provider !== 'mongodb') {
        const realResult = await prisma.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
        });
        const mockResult = await prismock.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: updatedReaction.userId,
              emoji: updatedReaction.emoji,
            },
          },
        });

        expect(realResult.value).toEqual(expectedNewValue);
        expect(mockResult.value).toEqual(expectedNewValue);
      }
    });

    it('Should not update other data', async () => {
      if (provider !== 'mongodb') {
        const realResult = await prisma.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: untouchedReaction.userId,
              emoji: untouchedReaction.emoji,
            },
          },
        });
        const mockResult = await prismock.reaction.findUnique({
          where: {
            userId_emoji: {
              userId: untouchedReaction.userId,
              emoji: untouchedReaction.emoji,
            },
          },
        });

        expect(realResult.value).toEqual(untouchedReaction.value);
        expect(mockResult.value).toEqual(untouchedReaction.value);
      }
    });
  });
});
