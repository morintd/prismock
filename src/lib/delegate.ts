import { DMMF } from '@prisma/generator-helper';

import { FindArgs, UpsertArgs } from './types';
import { DeleteArgs, create, findOne, findMany, deleteMany, UpdateArgs, updateMany } from './operations';
import { Data } from './prismock';

export type Item = Record<string, unknown>;

export type CreateArgs = {
  data: Item;
  include?: Record<string, boolean>;
  select: Item;
};

export type CreateManyArgs = {
  data: Item[];
  include?: Record<string, boolean>;
  select: Item;
};

export type Delegate = {
  create: (args: CreateArgs) => Promise<Item>;
  createMany: (args: CreateManyArgs) => Promise<{ count: number }>;
  delete: (args: DeleteArgs) => Promise<Item | null>;
  deleteMany: (args: DeleteArgs) => Promise<{ count: number }>;
  update: (args: UpdateArgs) => Promise<Item | null>;
  updateMany: (args: UpdateArgs) => Promise<{ count: number }>;
  upsert: (args: UpsertArgs) => Promise<Item>;
  findMany: (args?: FindArgs) => Promise<Item[]>;
  findUnique: (args: FindArgs) => Promise<Item>;
  findFirst: (args: FindArgs) => Promise<Item>;
  findUniqueOrThrow: (args: FindArgs) => Promise<Item>;
  findFirstOrThrow: (args: FindArgs) => Promise<Item>;
  count: (args: FindArgs) => Promise<number>;
};

export type DelegateProperties = {
  increment: Record<string, number>;
};

export type DelegateContext = {
  models: DMMF.Model[];
  model: DMMF.Model;
  name: string;
  data: Data;
  properties: Record<string, DelegateProperties>;
};

export function generateDelegate(
  models: DMMF.Model[],
  model: DMMF.Model,
  name: string,
  data: Data,
  properties: Record<string, DelegateProperties>,
): Delegate {
  const context: DelegateContext = { models, model, name, data, properties };

  return {
    delete: (args: DeleteArgs = {}) => {
      const deleted = deleteMany(data, name, args, context);

      if (deleted.length === 0) return Promise.reject(new Error());
      return Promise.resolve(deleted[0]);
    },
    deleteMany: (args: DeleteArgs = {}) => {
      const deleted = deleteMany(data, name, args, context);
      return Promise.resolve({ count: deleted.length });
    },
    update: (args: UpdateArgs) => {
      const updated = updateMany(data, name, args, context);
      return Promise.resolve(updated[0] ?? null);
    },
    updateMany: (args: UpdateArgs) => {
      const updated = updateMany(data, name, args, context);
      return Promise.resolve({ count: updated.length });
    },
    create: (args: CreateArgs) => {
      return Promise.resolve(create(data, name, properties[name], args.data, context));
    },
    createMany: (args: CreateManyArgs) => {
      args.data.forEach((d) => create(data, name, properties[name], d, context));
      return Promise.resolve({ count: args.data.length });
    },
    upsert: (args: UpsertArgs) => {
      const res = findOne(data[name], args, context);
      if (res) {
        const updated = updateMany(data, name, { ...args, data: args.update }, context);
        return Promise.resolve(updated[0] ?? null);
      } else {
        return Promise.resolve(create(data, name, properties[name], args.create, context));
      }
    },
    findMany: (args: FindArgs = {}) => {
      return Promise.resolve(findMany(data[name], args, context));
    },
    findUnique: (args: FindArgs = {}) => {
      return Promise.resolve(findOne(data[name], args, context) as Item);
    },
    findFirst: (args: FindArgs = {}) => {
      return Promise.resolve(findOne(data[name], args, context) as Item);
    },
    findUniqueOrThrow: (args: FindArgs = {}) => {
      const found = findOne(data[name], args, context);
      if (!found) return Promise.reject(new Error());
      return Promise.resolve(found);
    },
    findFirstOrThrow: (args: FindArgs = {}) => {
      const found = findOne(data[name], args, context);
      if (!found) return Promise.reject(new Error());
      return Promise.resolve(found);
    },
    count: (args: FindArgs = {}) => {
      const found = findMany(data[name], args, context);
      return Promise.resolve(found.length);
    },
  };
}
