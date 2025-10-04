import { DMMF } from '@prisma/generator-helper';

import { seededUsers } from '../../../testing';
import { fetchGenerator, generateDMMF, generatePrismockSync, getProvider } from '../../lib/prismock';
import { PrismockClient, PrismockClientType } from '../../lib/client';

describe('client (custom)', () => {
  let provider: string | undefined;

  beforeAll(async () => {
    const generator = await fetchGenerator();
    provider = getProvider(generator);
    generator.stop();
  });

  describe('generatePrismock', () => {
    it('Should get data', async () => {
      const prismock = new PrismockClient() as PrismockClientType;
      await prismock.user.createMany({ data: seededUsers.map(({ id, ...user }) => ({ ...user, parameters: {} })) });

      const data = prismock.getData();

      const expected = {
        user: seededUsers.map(({ id, ...user }) => user),
        blog: [],
        post: [],
        profile: [],
        service: [],
        subscription: [],
        comment: [],
      };

      if (provider !== 'mongodb') {
        Object.assign(expected, {
          reaction: [],
        });
      }

      expect({
        ...data,
        user: data.user.map(({ id, ...user }) => user),
      }).toEqual(expected);
    });
  });

  describe('generatePrismockSync', () => {
    let models: DMMF.Model[];

    beforeAll(async () => {
      const schema = await generateDMMF();
      models = schema.datamodel.models as DMMF.Model[];
    });

    it('Should get data', async () => {
      const prismock = generatePrismockSync({ models });
      await prismock.user.createMany({ data: seededUsers.map(({ id, ...user }) => ({ ...user, parameters: {} })) });

      const data = prismock.getData();

      const expected = {
        user: seededUsers.map(({ id, ...user }) => user),
        blog: [],
        post: [],
        profile: [],
        service: [],
        subscription: [],
        comment: [],
      };

      if (provider !== 'mongodb') {
        Object.assign(expected, {
          reaction: [],
        });
      }

      expect({
        ...data,
        user: data.user.map(({ id, ...user }) => user),
      }).toEqual(expected);
    });
  });
});
