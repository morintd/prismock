import { DMMF } from '@prisma/generator-helper';

import { seededBlogs, seededPosts, seededUsers } from '../../testing';
import { generateDMMF, generatePrismockSync } from '../lib/prismock';
import { PrismockClient, PrismockClientType } from '../lib/client';

describe('client (custom)', () => {
  describe('generatePrismock', () => {
    it('Should set/get data', () => {
      const prismock = new PrismockClient() as PrismockClientType;
      prismock.setData({ user: seededUsers, post: seededPosts, blog: seededBlogs });
      expect(prismock.getData()).toEqual({ user: seededUsers, post: seededPosts, blog: seededBlogs });
    });
  });

  describe('generatePrismockSync', () => {
    let models: DMMF.Model[];

    beforeAll(async () => {
      const schema = await generateDMMF();
      models = schema.datamodel.models;
    });

    it('Should set/get data', () => {
      const prismock = generatePrismockSync({ models });
      prismock.setData({ user: seededUsers, post: seededPosts, blog: seededBlogs });
      expect(prismock.getData()).toEqual({ user: seededUsers, post: seededPosts, blog: seededBlogs });
    });
  });
});
