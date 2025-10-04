import { Decimal } from '@prisma/client/runtime/library';
import { DMMF } from '@prisma/generator-helper';
import { ObjectId } from 'bson';
import { createId as createCuid } from '@paralleldrive/cuid2';

import { Delegate, DelegateProperties, Item } from '../delegate';
import { pipe, removeUndefined, uuid } from '../helpers';
import { Delegates } from '../prismock';
import { ConnectOrCreate, CreateArgs, FindWhereArgs } from '../types';
import { relationshipStore } from '../client';

import {
  findNextIncrement,
  findOne,
  getDelegateFromField,
  getFieldFromRelationshipWhere,
  getJoinField,
  includes,
  select,
} from './find';

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
    (field: DMMF.Field) => (field.default as DMMF.FieldDefault)?.name?.includes('uuid'),
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
  [
    (field: DMMF.Field) => (field.default as DMMF.FieldDefault)?.name === 'cuid',
    () => {
      return createCuid();
    },
  ],
  [
    (field: DMMF.Field) => (field.default as DMMF.FieldDefault)?.name === 'dbgenerated',
    () => {
      return uuid();
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
  if (field.type === 'Decimal' && typeof field.default === 'number') return new Decimal(field.default);

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
        const subDelegate = getDelegateFromField(field!, delegates);

        let connected = findOne({ where: connectOrCreate.where }, subDelegate, delegates);
        if (!connected) connected = create(connectOrCreate.create, {}, subDelegate, delegates, subDelegate.onChange);

        return {
          ...accumulator,
          ...getFieldFromRelationshipWhere(connected, field!),
        };
      }

      if (typeof value === 'object' && (value as Record<string, unknown>)?.connect) {
        const connect = (value as Record<string, unknown>).connect as FindWhereArgs;
        const field = delegate.model.fields.find((field) => field.name === key);
        const joinField = getJoinField(field!, delegates);
        const subDelegate = getDelegateFromField(field!, delegates);
        const relationshipName = field?.relationName as string;
        const relationship = relationshipStore.findRelationship(relationshipName);

        if (relationship) {
          relationshipStore.connectToRelationship({
            relationshipName,
            fieldName: field?.name as string,
            id: item.id as number,
            values: connect as unknown as { id: number }[],
          });
        } else if (Array.isArray(connect)) {
          connect.forEach((c) => {
            subDelegate.update({
              where: c,
              data: getFieldFromRelationshipWhere(accumulator, joinField!),
            });
          });
        } else {
          if (field!.relationFromFields!.length > 0) {
            const connected = findOne({ where: connect }, subDelegate, delegates);

            if (connected) {
              return {
                ...accumulator,
                ...getFieldFromRelationshipWhere(connected, field!),
              };
            }
          } else {
            subDelegate.update({
              where: connect,
              data: {
                ...getFieldFromRelationshipWhere(accumulator, joinField!),
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

export function nestedCreate(current: Delegate, delegates: Delegates) {
  return (item: Item) => {
    const created = {
      ...createDefaultValues(current.model.fields as DMMF.Field[], current.getProperties()),
      ...removeUndefined(item),
    };

    current.model.fields.forEach((field) => {
      const value = created[field.name];

      if (value) {
        const joinfield = getJoinField(field, delegates)!;

        if (joinfield) {
          const delegate = getDelegateFromField(field, delegates);

          const connect = getFieldFromRelationshipWhere(created, joinfield);
          if ((value as { create: Item }).create) {
            delete created[field.name];

            const data = (value as { create: Item }).create;

            if (Array.isArray(data)) {
              data.forEach((item) => {
                create({ ...item, ...connect }, {}, delegate, delegates, delegate.onChange);
              });
            } else {
              const nestedCreated = create({ ...data, ...connect }, {}, delegate, delegates, delegate.onChange);
              Object.assign(created, getFieldFromRelationshipWhere(nestedCreated, field));
            }
          }

          if ((value as { createMany: Item[] }).createMany) {
            delete created[field.name];

            const { data } = (value as { createMany: { data: Item[] } }).createMany;

            data.forEach((d) => {
              create({ ...d, ...connect }, {}, delegate, delegates, delegate.onChange);
            });
          }
        }
      }
    });

    return created;
  };
}

export function create(
  item: Item,
  options: Omit<CreateArgs, 'data'>,
  delegate: Delegate,
  delegates: Delegates,
  onChange: (items: Item[]) => void,
) {
  const formatted = pipe(nestedCreate(delegate, delegates), connectOrCreate(delegate, delegates))(item);
  const created = pipe(includes(options, delegate, delegates), select(options.select))(formatted);

  onChange([...delegate.getItems(), formatted]);

  return created;
}
