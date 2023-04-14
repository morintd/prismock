import { Prisma, PrismaClient } from '@prisma/client';

import { Delegate } from './delegate';
import { Data, generateDelegates } from './prismock';

type GetData = () => Data;
type SetData = (data: Data) => void;

export type PrismockClientType<T = PrismaClient> = T & {
  getData: GetData;
  setData: SetData;
};

type TransactionArgs<T> = (tx: Omit<T, '$transaction'>) => unknown | Promise<unknown>[];

export function generateClient<T = PrismaClient>(delegates: Record<string, Delegate>, getData: GetData, setData: SetData) {
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

class Prismock {
  constructor() {
    const { delegates, setData, getData } = generateDelegates({ models: Prisma.dmmf.datamodel.models });
    Object.assign(this, { setData, getData, ...delegates });
  }

  async $connect() {
    return Promise.resolve();
  }

  $disconnect() {
    return Promise.resolve();
  }

  $on() {}

  $use() {}

  $executeRaw() {
    return Promise.resolve(0) as Prisma.PrismaPromise<number>;
  }

  $executeRawUnsafe() {
    return Promise.resolve(0) as Prisma.PrismaPromise<number>;
  }

  $queryRaw() {
    return Promise.resolve([]) as Prisma.PrismaPromise<any>;
  }

  $queryRawUnsafe() {
    return Promise.resolve([]) as Prisma.PrismaPromise<any>;
  }

  async $transaction(args: any) {
    if (Array.isArray(args)) {
      return Promise.all(args);
    }

    return args(this);
  }
}

interface PrismockData {
  getData: GetData;
  setData: SetData;
}

export const PrismockClient = Prismock as unknown as typeof PrismaClient & PrismockData;
