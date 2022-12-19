import { DMMF } from '@prisma/generator-helper';

import { AggregateArgs, FindArgs, SelectArgs, UpsertArgs } from './types';
import { DeleteArgs, create, findOne, findMany, deleteMany, UpdateArgs, updateMany, aggregate } from './operations';
import { Data, Delegates, Properties } from './prismock';

export type Item = Record<string, unknown>;

export type CreateArgs = {
  data: Item;
  include?: Record<string, boolean> | null;
  select?: SelectArgs | null;
};

export type CreateManyArgs = {
  data: Item[];
  include?: Record<string, boolean> | null;
  select?: SelectArgs | null;
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
  model: DMMF.Model;
  getProperties: () => DelegateProperties;
  getItems: () => Item[];
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
  model: DMMF.Model,
  data: Data,
  name: string,
  properties: Properties,
  delegates: Delegates,
  onChange: (items: Item[]) => void,
): Delegate {
  const delegate = {} as Delegate;

  Object.assign(delegate, {
    delete: (args: DeleteArgs = {}) => {
      const deleted = deleteMany(args, delegate, delegates, onChange);

      if (deleted.length === 0) return Promise.reject(new Error());
      return Promise.resolve(deleted[0]);
    },
    deleteMany: (args: DeleteArgs = {}) => {
      const deleted = deleteMany(args, delegate, delegates, onChange);
      return Promise.resolve({ count: deleted.length });
    },
    update: (args: UpdateArgs) => {
      const updated = updateMany(args, delegate, delegates, onChange);
      return Promise.resolve(updated[0] ?? null);
    },
    updateMany: (args: UpdateArgs) => {
      const updated = updateMany(args, delegate, delegates, onChange);
      return Promise.resolve({ count: updated.length });
    },
    create: (args: CreateArgs) => {
      const { data, ...options } = args;
      return Promise.resolve(create(data, options, delegate, delegates, onChange));
    },
    createMany: (args: CreateManyArgs) => {
      const { data, ...options } = args;
      data.forEach((d) => {
        create(d, options, delegate, delegates, onChange);
      });
      return Promise.resolve({ count: args.data.length });
    },
    upsert: (args: UpsertArgs) => {
      const res = findOne(args, delegate, delegates);
      if (res) {
        const updated = updateMany({ ...args, data: args.update }, delegate, delegates, onChange);
        return Promise.resolve(updated[0] ?? null);
      } else {
        const { create: data, ...options } = args;
        return Promise.resolve(create(data, options, delegate, delegates, onChange));
      }
    },
    findMany: (args: FindArgs = {}) => {
      return Promise.resolve(findMany(args, delegate, delegates));
    },
    findUnique: (args: FindArgs = {}) => {
      return Promise.resolve(findOne(args, delegate, delegates) as Item);
    },
    findFirst: (args: FindArgs = {}) => {
      return Promise.resolve(findOne(args, delegate, delegates) as Item);
    },
    findUniqueOrThrow: (args: FindArgs = {}) => {
      const found = findOne(args, delegate, delegates);
      if (!found) return Promise.reject(new Error());
      return Promise.resolve(found);
    },
    findFirstOrThrow: (args: FindArgs = {}) => {
      const found = findOne(args, delegate, delegates);
      if (!found) return Promise.reject(new Error());
      return Promise.resolve(found);
    },
    count: (args: FindArgs = {}) => {
      const found = findMany(args, delegate, delegates);
      return Promise.resolve(found.length);
    },
    aggregate: (args: AggregateArgs = {}) => {
      const found = findMany(args, delegate, delegates);
      const aggregated = aggregate(args, found);

      return Promise.resolve(aggregated);
    },
    model,
    getItems: () => data[name],
    getProperties: () => properties[name],
  });

  return delegate;
}
