import { Prisma } from '@prisma/client';
import { DMMF } from '@prisma/generator-helper';
import { ObjectId } from 'bson';

import { Delegate, DelegateProperties, Item } from '../delegate';
import { camelize, uuid } from '../helpers';
import { Delegates } from '../prismock';
import { ConnectOrCreate, CreateArgs, FindWhereArgs } from '../types';

import { findNextIncrement, findOne, getJoinField, includes, select } from './find';

export const isAutoIncrement = (field: DMMF.Field) => {
  return (field.default as DMMF.FieldDefault)?.name === 'autoincrement';
};

const defaultFieldhandlers: [
  (field: DMMF.Field) => boolean,
  (properties: DelegateProperties, field: DMMF.Field) => unknown,
][] = [
  [
    isAutoIncrement,
    (properties: DelegateProperties, field: DMMF.Field) => {
      return findNextIncrement(properties, field.name);
    },
  ],
  [
    (field: DMMF.Field) => (field.default as DMMF.FieldDefault)?.name === 'now',
    () => {
      return new Date();
    },
  ],
  [
    (field: DMMF.Field) => (field.default as DMMF.FieldDefault)?.name === 'uuid',
    () => {
      return uuid();
    },
  ],
  [
    (field: DMMF.Field) => (field.default as DMMF.FieldDefault)?.name === 'auto',
    () => {
      return new ObjectId().toString();
    },
  ],
];

export function calculateDefaultFieldValue(field: DMMF.Field, properties: DelegateProperties) {
  if (typeof field.default === 'object') {
    const handler = defaultFieldhandlers.find(([check]) => check(field));

    if (handler) return handler[1](properties, field);
  }

  if (field.type === 'BigInt' && typeof field.default === 'string') return BigInt(field.default);
  if (field.type === 'Json' && typeof field.default === 'string')
    return JSON.parse(field.default) as Record<string, unknown>;
  if (field.type === 'Decimal' && typeof field.default === 'number') return new Prisma.Decimal(field.default);

  if (['string', 'number', 'boolean'].includes(typeof field.default)) return field.default;
  return undefined;
}

export function createDefaultValues(fields: DMMF.Field[], properties: DelegateProperties) {
  return fields.reduce((defaultValues: Record<string, unknown>, currentField) => {
    if (currentField.hasDefaultValue === true) {
      const defaultValue = calculateDefaultFieldValue(currentField, properties);
      if (defaultValue !== undefined) defaultValues[currentField.name] = defaultValue;
    } else if (currentField.kind !== 'object') {
      defaultValues[currentField.name] = null;
    }
    return defaultValues;
  }, {});
}

export function connectOrCreate(delegate: Delegate, delegates: Delegates) {
  return (item: Item) => {
    return Object.entries(item).reduce((accumulator, [key, value]) => {
      if (typeof value === 'object' && (value as Record<string, unknown>)?.connectOrCreate) {
        const connectOrCreate = (value as Record<string, unknown>).connectOrCreate as ConnectOrCreate;

        const field = delegate.model.fields.find((field) => field.name === key);
        const subDelegate = delegates[camelize(field!.type)];

        let connected = findOne({ where: connectOrCreate.where }, subDelegate, delegates);
        if (!connected) connected = create(connectOrCreate.create, {}, subDelegate, delegates, subDelegate.onChange);

        return {
          ...accumulator,
          [field!.relationFromFields![0]]: connected[field!.relationToFields![0]],
        };
      }

      if (typeof value === 'object' && (value as Record<string, unknown>)?.connect) {
        const connect = (value as Record<string, unknown>).connect as FindWhereArgs;

        const field = delegate.model.fields.find((field) => field.name === key);
        const joinField = getJoinField(field!, delegates);
        const subDelegate = delegates[camelize(field!.type)];

        if (Array.isArray(connect)) {
          connect.forEach((c) => {
            subDelegate.update({
              where: c,
              data: {
                [joinField!.relationFromFields![0]]: accumulator[joinField!.relationToFields![0]],
              },
            });
          });
        } else {
          if (field!.relationFromFields!.length > 0) {
            const connected = findOne({ where: connect }, subDelegate, delegates);

            if (connected) {
              return {
                ...accumulator,
                [field!.relationFromFields![0]]: connected[field!.relationToFields![0]],
              };
            }
          } else {
            subDelegate.update({
              where: connect,
              data: {
                [joinField!.relationFromFields![0]]: accumulator[joinField!.relationToFields![0]],
              },
            });
          }
        }

        return accumulator;
      }

      return {
        ...accumulator,
        [key]: value,
      };
    }, {} as Item);
  };
}

export function create(
  item: Item,
  options: Omit<CreateArgs, 'data'>,
  delegate: Delegate,
  delegates: Delegates,
  onChange: (items: Item[]) => void,
) {
  const created = { ...createDefaultValues(delegate.model.fields, delegate.getProperties()), ...item };

  const withConnectOrCreate = connectOrCreate(delegate, delegates)(created);

  const withIncludes = includes(options, delegate, delegates)(withConnectOrCreate);
  const withSelect = select(withIncludes, options.select);

  onChange([...delegate.getItems(), withConnectOrCreate]);

  return withSelect;
}
