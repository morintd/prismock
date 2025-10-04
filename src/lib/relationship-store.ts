import type { DMMF } from '@prisma/generator-helper';

import type { FindWhereArgs } from './types';

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

type CleanupRelationshipsParams = {
  type: string;
  id: number;
};

export class RelationshipStore {
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
    return !found ? -1 : 1;
  }

  getRelationshipIds(name: string, type: string, id: FindWhereArgs | number) {
    const relationship = this.findRelationship(name);

    if (!relationship) {
      return [];
    }

    if (this.isSymmetrical(relationship)) {
      return this.extractSymmetricalValues(relationship, id);
    }

    const [valueField, targetField] = this.getRelationshipFieldNames(relationship, type);
    const values = relationship.values.filter((x) => x[targetField] === id).map((x) => x[valueField]);
    return values;
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

  disconnectFromRelationship({ relationshipName, fieldName, id, values }: RelationActionParams) {
    const relationship = this.findRelationship(relationshipName);

    if (!relationship) {
      return;
    }

    if (!Array.isArray(values)) {
      const value = this.getActionValue({ relationship, fieldName, id, value: values });
      relationship.values = relationship.values.filter((x) => !this.matchEntry(x, value));
      return;
    }

    relationship.values = relationship.values.filter(
      (x) =>
        !values
          .map((x) => this.getActionValue({ relationship, fieldName, id, value: x }))
          .find((y) => this.matchEntry(x, y)),
    );
  }

  cleanupRelationships({ type, id }: CleanupRelationshipsParams) {
    Object.values(this.getRelationships())
      .filter(({ a, b }) => a.type === type || b.type === type)
      .forEach((relationship) => {
        if (this.isSymmetrical(relationship)) {
          relationship.values = relationship.values.filter(({ a, b }) => a !== id && b !== id);
          return;
        }
        const [_, targetField] = this.getRelationshipFieldNames(relationship, type);
        relationship.values = relationship.values.filter((value) => value[targetField] !== id);
      });
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

    return values
      .map(({ a, b }) => ((id.in as number[]).some((id) => a === id || b === id) ? [id, { a, b }] : null))
      .filter((x) => !!x)
      .map(([id, { a, b }]) => (a === id ? b : a));
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
