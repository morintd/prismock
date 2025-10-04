import { Prisma, type PrismaClient } from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';
import { DMMF } from '@prisma/generator-helper';

import { Delegate } from './delegate';
import { Data, Delegates, generateDelegates } from './prismock';
import { RelationshipStore } from './relationship-store';

type GetData = () => Data;
type SetData = (data: Data) => void;

interface PrismockData {
  getData: GetData;
  setData: SetData;
  reset: () => void;
}
export type PrismockClientType<T = PrismaClient> = T & PrismockData;

type TransactionArgs<T> = (tx: Omit<T, '$transaction'>) => unknown | Promise<unknown>[];

export function generateClient<T = PrismaClient>(delegates: Record<string, Delegate>, getData: GetData, setData: SetData) {
  // eslint-disable-next-line no-console
  console.log(
    'Deprecation notice: generatePrismock and generatePrismockSync should be replaced with PrismockClient. See https://github.com/morintd/prismock/blob/master/docs/generate-prismock-deprecated.md',
  );

  const client = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $on: () => {},
    $use: () => {},
    $executeRaw: () => Promise.resolve(0),
    $executeRawUnsafe: () => Promise.resolve(0),
    $queryRaw: () => Promise.resolve([]),
    $queryRawUnsafe: () => Promise.resolve([]),
    getData,
    setData,
    ...delegates,
  } as unknown as PrismockClientType<T>;

  return {
    ...client,
    $transaction: async (args: TransactionArgs<T>) => {
      if (Array.isArray(args)) {
        return Promise.all(args);
      }

      return args(client);
    },
  } as unknown as PrismockClientType<T>;
}

type PrismaModule = {
  dmmf: runtime.BaseDMMF;
};

export let relationshipStore: RelationshipStore;

export function createPrismock(instance: PrismaModule) {
  return class Prismock {
    constructor() {
      this.generate();
    }

    reset() {
      this.generate();
    }

    private generate() {
      relationshipStore = new RelationshipStore(instance.dmmf.datamodel.models as DMMF.Model[]);
      const { delegates, setData, getData } = generateDelegates({ models: instance.dmmf.datamodel.models as DMMF.Model[] });
      Object.entries({ ...delegates, setData, getData }).forEach(([key, value]) => {
        if (key in this) Object.assign((this as unknown as Delegates)[key], value);
        else Object.assign(this, { [key]: value });
      });
    }

    async $connect() {
      return Promise.resolve();
    }

    $disconnect() {
      return Promise.resolve();
    }

    $on() {}

    $use() {
      return this;
    }

    $executeRaw() {
      return Promise.resolve(0);
    }

    $executeRawUnsafe() {
      return Promise.resolve(0);
    }

    $queryRaw() {
      return Promise.resolve([]);
    }

    $queryRawUnsafe() {
      return Promise.resolve([]);
    }

    $extends() {
      return this;
    }

    async $transaction(args: any) {
      if (Array.isArray(args)) {
        return Promise.all(args);
      }

      return args(this);
    }
  } as unknown as typeof PrismaClient & PrismockData;
}

export const PrismockClient = createPrismock(Prisma);
