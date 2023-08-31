import { Prisma, PrismaClient } from '@prisma/client';

import { Delegate } from './delegate';
import { Data, generateDelegates } from './prismock';

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

class Prismock {
  constructor() {
    this.generate();
  }

  reset() {
    this.generate();
  }

  private generate() {
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
}

export const PrismockClient = Prismock as unknown as typeof PrismaClient & PrismockData;
