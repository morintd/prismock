import { version as clientVersion } from '@prisma/client/package.json';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { DMMF } from '@prisma/generator-helper';

import { AggregateArgs, CreateArgs, CreateManyArgs, FindArgs, GroupByArgs, UpsertArgs } from './types';
import { DeleteArgs, create, findOne, findMany, deleteMany, UpdateArgs, updateMany, aggregate, groupBy } from './operations';
import { Data, Delegates, Properties, RelationshipStore } from './prismock';

export type Item = Record<string, unknown>;

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
  groupBy: (args: GroupByArgs) => Promise<any[]>;
  count: (args: FindArgs) => Promise<number>;
  model: DMMF.Model;
  getProperties: () => DelegateProperties;
  getItems: () => Item[];
  onChange: (items: Item[]) => void;
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
  relationshipStore: RelationshipStore,
  onChange: (items: Item[]) => void,
): Delegate {
  const delegate = {} as Delegate;

  Object.assign(delegate, {
    delete: (args: DeleteArgs = {}) => {
      const deleted = deleteMany(args, delegate, delegates, onChange);

      if (deleted.length === 0)
        return Promise.reject(
          new PrismaClientKnownRequestError(`No ${delegate.model.name} found`, {
            code: 'P2025',
            clientVersion,
            meta: {
              cause: 'Record to delete does not exist.',
              modelName: delegate.model.name,
            },
          }),
        );
      return Promise.resolve(deleted[0]);
    },
    deleteMany: (args: DeleteArgs = {}) => {
      const deleted = deleteMany(args, delegate, delegates, onChange);
      return Promise.resolve({ count: deleted.length });
    },
    update: (args: UpdateArgs) => {
      const updated = updateMany(args, delegate, delegates, relationshipStore, onChange);
      const [update] = updated;

      return update
        ? Promise.resolve(update)
        : Promise.reject(
            new PrismaClientKnownRequestError(`No ${delegate.model.name} found`, {
              code: 'P2025',
              clientVersion,
              meta: {
                cause: 'Record to update not found.',
                modelName: delegate.model.name,
              },
            }),
          );
    },
    updateMany: (args: UpdateArgs) => {
      const updated = updateMany(args, delegate, delegates, relationshipStore, onChange);
      return Promise.resolve({ count: updated.length });
    },
    create: (args: CreateArgs) => {
      const { data, ...options } = args;
      return Promise.resolve(create(data, options, delegate, delegates, onChange, relationshipStore));
    },
    createMany: (args: CreateManyArgs) => {
      const { data, ...options } = args;
      data.forEach((d) => {
        create(d, options, delegate, delegates, onChange, relationshipStore);
      });
      return Promise.resolve({ count: args.data.length });
    },
    upsert: (args: UpsertArgs) => {
      const res = findOne(args, delegate, delegates);
      if (res) {
        const updated = updateMany({ ...args, data: args.update }, delegate, delegates, relationshipStore, onChange);
        return Promise.resolve(updated[0] ?? null);
      } else {
        const { create: data, ...options } = args;
        return Promise.resolve(create(data, options, delegate, delegates, onChange, relationshipStore));
      }
    },
    findMany: (args: FindArgs = {}) => {
      return Promise.resolve(findMany(args, delegate, delegates, relationshipStore));
    },
    findUnique: (args: FindArgs = {}) => {
      return Promise.resolve(findOne(args, delegate, delegates, relationshipStore) as Item);
    },
    findFirst: (args: FindArgs = {}) => {
      return Promise.resolve(findOne(args, delegate, delegates, relationshipStore) as Item);
    },
    findUniqueOrThrow: (args: FindArgs = {}) => {
      const found = findOne(args, delegate, delegates, relationshipStore);
      if (!found)
        return Promise.reject(
          new PrismaClientKnownRequestError(`No ${delegate.model.name} found`, {
            code: 'P2025',
            clientVersion,
          }),
        );
      return Promise.resolve(found);
    },
    findFirstOrThrow: (args: FindArgs = {}) => {
      const found = findOne(args, delegate, delegates, relationshipStore);
      if (!found)
        return Promise.reject(
          new PrismaClientKnownRequestError(`No ${delegate.model.name} found`, {
            code: 'P2025',
            clientVersion,
          }),
        );
      return Promise.resolve(found);
    },
    count: (args: FindArgs = {}) => {
      const found = findMany(args, delegate, delegates, relationshipStore);
      return Promise.resolve(found.length);
    },
    aggregate: (args: AggregateArgs = {}) => {
      const found = findMany(args, delegate, delegates);
      const aggregated = aggregate(args, found);

      return Promise.resolve(aggregated);
    },
    groupBy: (args: GroupByArgs) => {
      return Promise.resolve(groupBy(args, delegate, delegates));
    },
    createManyAndReturn: (args: CreateManyArgs) => {
      const { data, ...options } = args;
      const created = data.map((d) => create(d, options, delegate, delegates, onChange, relationshipStore));
      return Promise.resolve(created);
    },
    model,
    getItems: () => data[name],
    getProperties: () => properties[name],
    onChange,
  });

  return delegate;
}
