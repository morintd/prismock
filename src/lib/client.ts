import { Prisma, type PrismaClient } from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';
import { DMMF } from '@prisma/generator-helper';

import { Delegate } from './delegate';
import { Data, Delegates, generateDelegates } from './prismock';
import { FindWhereArgs } from './types';

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

type RelationshipEntry = { a: number; b: number };

type Relationship = {
  name: string;
  a: { name: string; type: string };
  b: { name: string; type: string };
  values: RelationshipEntry[];
};

type RelationActionParams = {
  relationshipName: string;
  fieldName: string;
  id: number;
  values: { id: number } | { id: number }[];
};

type MatchParams = {
  type: string;
  name: string;
  itemId: number;
  where: FindWhereArgs;
};

class RelationshipStore {
  private relationships: Record<string, Relationship>;
  constructor(models: DMMF.Model[]) {
    this.relationships = {};
    this.populateRelationships(models);
  }

  getRelationships() {
    return this.relationships;
  }

  findRelationship(name: string) {
    return this.relationships[name];
  }

  findRelationshipBy(type: string, name: string) {
    return Object.values(this.relationships).find(
      ({ a, b }) => (a.type === type && b.name === name) || (b.type === type && a.name === name),
    );
  }

  match({ type, name, itemId, where }: MatchParams) {
    const relationship = this.findRelationshipBy(type, name);
    if (!relationship) {
      return 0;
    }
    if (where.none && !relationship.values.length) {
      return 1;
    }

    const [valueField, targetField] = this.getRelationshipFieldNames(relationship, type);
    const found = relationship.values.find((x) => {
      if (where.some) {
        return x[valueField] === itemId && x[targetField] === (where.some as { id: number }).id;
      }
      if (where.none) {
        return x[valueField] !== itemId || x[targetField] !== (where.none as { id: number }).id;
      }
      return false;
    });
    if (!found) {
      return -1;
    }
    return 1;
  }

  getRelationshipIds(name: string, type: string, id: FindWhereArgs | number) {
    const relationship = this.findRelationship(name);
    if (!relationship) {
      return false;
    }
    if (this.isSymmetrical(relationship)) {
      return this.extractSymmetricalValues(relationship, id);
    }
    const [valueField] = this.getRelationshipFieldNames(relationship, type);
    return relationship.values.map((x) => x[valueField]);
  }

  connectToRelationship({ relationshipName, fieldName, id, values }: RelationActionParams) {
    const relationship = this.findRelationship(relationshipName);
    if (!relationship) {
      return;
    }
    if (!Array.isArray(values)) {
      const value = this.getActionValue({ relationship, fieldName, id, value: values });
      relationship.values = relationship.values.find((x) => this.matchEntry(x, value))
        ? relationship.values
        : [...relationship.values, value];
      return;
    }
    relationship.values = [
      ...relationship.values,
      ...values
        .map((x) => this.getActionValue({ relationship, fieldName, id, value: x }))
        .map((x) => (relationship.values.find((y) => this.matchEntry(x, y)) ? null : x))
        .filter((x) => !!x),
    ];
  }

  disconnectFromRelation({ relationshipName, fieldName, id, values }: RelationActionParams) {
    const relationship = this.findRelationship(relationshipName);
    if (!relationship) {
      return;
    }
    if (!Array.isArray(values)) {
      const value = this.getActionValue({ relationship, fieldName, id, value: values });
      relationship.values = relationship.values.filter((x) => this.matchEntry(x, value));
      return;
    }
    relationship.values = relationship.values.filter(
      (x) =>
        !values
          .map((x) => this.getActionValue({ relationship, fieldName, id, value: x }))
          .find((y) => this.matchEntry(x, y)),
    );
  }

  resetValues() {
    Object.values(this.relationships).forEach((x) => (x.values = []));
  }

  private getRelationshipFieldNames({ a }: Relationship, type: string): ['a', 'b'] | ['b', 'a'] {
    return a.type === type ? ['a', 'b'] : ['b', 'a'];
  }

  private matchEntry(x: RelationshipEntry, y: RelationshipEntry) {
    return x.a === y.a && x.b === y.b;
  }

  private isSymmetrical({ a, b }: Relationship) {
    return a.type === b.type;
  }

  private extractSymmetricalValues({ values }: Relationship, id: FindWhereArgs | number) {
    if (typeof id === 'number') {
      return values.filter(({ a, b }) => a === id || b === id).map(({ a, b }) => (a === id ? b : a));
    }
    return (id.in as number[]).some((id) =>
      values.filter(({ a, b }) => a === id || b === id).map(({ a, b }) => (a === id ? b : a)),
    );
  }

  private getActionValue({
    relationship,
    fieldName,
    id,
    value,
  }: {
    relationship: Relationship;
    fieldName: string;
    id: number;
    value: { id: number };
  }) {
    if (relationship.a.name === fieldName) {
      return { a: value.id, b: id };
    }
    return { a: id, b: value.id };
  }

  private populateRelationships(models: DMMF.Model[]) {
    this.relationships = Object.entries(
      this.groupBy(
        models.flatMap((x) => x.fields),
        (x) => x.relationName as string,
      ),
    )
      .filter(
        ([key, fields]) =>
          key !== 'undefined' &&
          fields.every(({ relationFromFields: from, relationToFields: to }) => !from?.length && !to?.length),
      )
      .map(([_, fields]) => fields.sort((a, b) => ((a?.name as string) > (b?.name as string) ? 1 : -1)))
      .reduce(
        (memo, [a, b]) => ({
          ...memo,
          [a?.relationName as string]: {
            name: a?.relationName as string,
            values: [],
            a: {
              name: a?.name as string,
              type: a?.type as string,
            },
            b: {
              name: b?.name as string,
              type: b?.type as string,
            },
          },
        }),
        {},
      );
  }

  private groupBy<T>(array: T[], aggregator: (item: T) => string): Record<string, T[]> {
    return array.reduce((memo, item) => {
      const key = aggregator(item);
      return {
        ...memo,
        [key]: memo[key] ? [...memo[key], item] : [item],
      };
    }, {} as Record<string, T[]>);
  }
}
