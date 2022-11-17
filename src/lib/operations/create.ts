import { Prisma } from '@prisma/client';
import { DMMF } from '@prisma/generator-helper';
import { ObjectId } from 'bson';

import { CreateArgs, Delegate, DelegateProperties, Item } from '../delegate';
import { uuid } from '../helpers';
import { Delegates } from '../prismock';

import { findNextIncrement, includes, select } from './find';

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

export function create(
  item: Item,
  options: Omit<CreateArgs, 'data'>,
  delegate: Delegate,
  delegates: Delegates,
  onChange: (items: Item[]) => void,
) {
  const created = { ...createDefaultValues(delegate.model.fields, delegate.getProperties()), ...item };
  onChange([...delegate.getItems(), created]);

  const withIncludes = includes(options, delegate, delegates)(created);
  const withSelect = select(withIncludes, options.select);

  return withSelect;
}
