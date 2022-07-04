import { Prisma } from '@prisma/client';
import { DMMF } from '@prisma/generator-helper';

import { DelegateContext, DelegateProperties, Item } from '../delegate';
import { Data } from '../prismock';

import { findNextIncrement } from './find';

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

export function create(data: Data, name: string, properties: DelegateProperties, item: Item, context: DelegateContext) {
  const created = { ...createDefaultValues(context.model.fields, properties), ...item };
  Object.assign(data, { [name]: [...data[name], created] });

  return created as Item;
}
