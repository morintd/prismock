import { Delegate, Item } from '../delegate';
import { camelize, pipe, removeUndefined } from '../helpers';
import { Delegates } from '../prismock';
import { FindWhereArgs, SelectArgs, UpsertArgs } from '../types';
import { relationshipStore } from '../client';

import { calculateDefaultFieldValue, connectOrCreate, create } from './create';
import {
  findOne,
  getDelegateFromField,
  getFieldFromRelationshipWhere,
  getFieldRelationshipWhere,
  getJoinField,
  includes,
  select,
  where,
} from './find';

export type UpdateArgs = {
  select?: SelectArgs | null;
  include?: Record<string, boolean> | null;
  data: Item;
  where: FindWhereArgs;
};

export type UpdateMap = {
  toUpdate: Item[];
  updated: Item[];
};

const update = (args: UpdateArgs, isCreating: boolean, item: Item, current: Delegate, delegates: Delegates) => {
  const { data }: any = args;
  current.model.fields.forEach((field) => {
    if (data[field.name]) {
      const fieldData = data[field.name];

      if (field.kind === 'object') {
        if (fieldData.disconnect) {
          const disconnected = data[field.name];
          delete data[field.name];
          const relationshipName = field?.relationName as string;
          const relationship = relationshipStore.findRelationship(relationshipName);
          if (relationship) {
            relationshipStore.disconnectFromRelationship({
              relationshipName,
              fieldName: field.name,
              id: args.where.id as number,
              values: disconnected.disconnect,
            });
          }
        }
        if (fieldData.connect) {
          const connected = data[field.name];
          delete data[field.name];

          const delegate = delegates[camelize(field.type)];
          const joinField = getJoinField(field, delegates)!;
          const relationToField = joinField.relationToFields![0];

          const joinValue = Array.isArray(fieldData.connect)
            ? { in: fieldData.connect.map((x: any) => x[relationToField]) }
            : fieldData.connect[relationToField];

          const relationshipName = field?.relationName as string;
          const relationship = relationshipStore.findRelationship(relationshipName);

          if (relationship) {
            relationshipStore.connectToRelationship({
              relationshipName,
              fieldName: field.name,
              id: args.where.id as number,
              values: fieldData.connect,
            });
          } else if (!joinField.isList) {
            // @TODO: what's happening if we try to update on an Item that doesn't exist?
            const joined = findOne({ where: args.where }, getDelegateFromField(joinField, delegates), delegates) as Item;
            delegate.updateMany({
              where: { [relationToField]: joinValue },
              data: getFieldFromRelationshipWhere(joined, joinField),
            });
          } else {
            const joined = findOne({ where: connected.connect }, getDelegateFromField(field, delegates), delegates) as Item;
            Object.assign(data, getFieldFromRelationshipWhere(joined, field));
          }
        }
        if (fieldData.connectOrCreate) {
          delete data[field.name];

          const delegate = getDelegateFromField(field, delegates);
          connectOrCreate(current, delegates)({ [camelize(field.name)]: fieldData });
          const joined = findOne({ where: fieldData.connectOrCreate.where }, delegate, delegates) as Item;

          Object.assign(data, getFieldFromRelationshipWhere(joined, field));
        }
        if (fieldData.create || fieldData.createMany) {
          const toCreate = data[field.name];
          delete data[field.name];

          const delegate = getDelegateFromField(field, delegates);
          const joinField = getJoinField(field, delegates)!;

          if (field.relationFromFields?.[0]) {
            delegate.create(data[field.name].create);
            Object.assign(data, getFieldFromRelationshipWhere(item, field));
          } else {
            const formatCreatedItem = (val: Item) => {
              return {
                ...val,
                [joinField.name]: {
                  connect: joinField.relationToFields!.reduce((prev, cur) => {
                    let val = data[cur];
                    if (!isCreating && !val) {
                      val = findOne(args, delegates[camelize(joinField.type)], delegates)?.[cur];
                    }
                    return { ...prev, [cur]: val };
                  }, {}),
                },
              } as Record<string, Item>;
            };
            if (fieldData.createMany) {
              fieldData.createMany.data
                .map(formatCreatedItem)
                .forEach((createSingle: Item) => delegate.create({ data: createSingle }));
            } else {
              if (Array.isArray(fieldData.create)) {
                fieldData.create
                  .map(formatCreatedItem)
                  .forEach((createSingle: Item) => delegate.create({ data: createSingle }));
              } else {
                const createData = { ...toCreate.create };
                const mapped = formatCreatedItem(toCreate.create)[joinField.name].connect as Item;

                if (joinField) {
                  Object.assign(createData, getFieldFromRelationshipWhere(mapped, joinField));
                }

                delegate.create({ data: createData });
              }
            }
          }
        }
        if (fieldData.update || fieldData.updateMany) {
          const joinField = getJoinField(field, delegates);
          const where = {};

          if (joinField) {
            Object.assign(where, getFieldFromRelationshipWhere(args.where, joinField));
          }

          delete data[field.name];
          const delegate = delegates[camelize(field.type)];

          if (fieldData.updateMany) {
            Object.assign(where, fieldData.updateMany.where);

            if (Array.isArray(fieldData.updateMany)) {
              fieldData.updateMany.forEach((toUpdateMany: UpdateArgs) => {
                delegate.updateMany({ where, data: toUpdateMany.data ?? toUpdateMany });
              });
            } else {
              delegate.updateMany({ where, data: fieldData.updateMany.data ?? fieldData.updateMany });
            }
          } else {
            const joinField = getJoinField(field, delegates)!;
            Object.assign(where, fieldData.update.where);

            if (Array.isArray(fieldData.update)) {
              fieldData.update.forEach((toUpdate: UpdateArgs) => {
                delegate.updateMany({ where, data: toUpdate.data ?? toUpdate });
              });
            } else {
              const item = findOne(args, delegates[camelize(joinField.type)], delegates)!;

              delegate.updateMany({
                where: getFieldRelationshipWhere(item, field, delegates),
                data: fieldData.update.data ?? fieldData.update,
              });
            }
          }
        }
        if (fieldData.upsert) {
          const upsert: Pick<UpsertArgs, 'create' | 'update'> = fieldData.upsert;
          delete data[field.name];

          const subDelegate = delegates[camelize(field.type)];
          const item = findOne({ where: args.where }, current, delegates);

          if (item) {
            const joinWhere = getFieldRelationshipWhere(item, field, delegates);
            const joined = Object.values(joinWhere)[0] ? findOne({ where: joinWhere }, subDelegate, delegates) : null;

            if (joined) {
              updateMany(
                { where: joinWhere, data: upsert.update } as UpdateArgs,
                subDelegate,
                delegates,
                subDelegate.onChange,
              );
            } else {
              const created = create(upsert.create, {}, subDelegate, delegates, subDelegate.onChange);

              Object.assign(data, getFieldFromRelationshipWhere(created, field));
            }
          }
        }
      }

      if (field.isList) {
        if (fieldData.push && typeof fieldData.push !== 'function') {
          if (Array.isArray(fieldData.push))
            Object.assign(data, { [field.name]: (item[field.name] as Array<unknown>).concat(fieldData.push) });
          else Object.assign(data, { [field.name]: (item[field.name] as Array<unknown>).concat([fieldData.push]) });
        }
      }

      if (fieldData.increment) {
        Object.assign(data, { [field.name]: (item[field.name] as number) + (fieldData.increment as number) });
      }
      if (fieldData.decrement) {
        Object.assign(data, { [field.name]: (item[field.name] as number) - fieldData.decrement });
      }
      if (fieldData.multiply) {
        Object.assign(data, { [field.name]: (item[field.name] as number) * fieldData.multiply });
      }
      if (fieldData.divide) {
        Object.assign(data, { [field.name]: (item[field.name] as number) / fieldData.divide });
      }
      if (fieldData.set) {
        Object.assign(data, { [field.name]: fieldData.set });
      }
    }

    if ((isCreating || data[field.name] === null) && (data[field.name] === null || data[field.name] === undefined)) {
      if (field.hasDefaultValue) {
        const defaultValue = calculateDefaultFieldValue(field, current.getProperties());
        if (defaultValue !== undefined && !data[field.name]) Object.assign(data, { [field.name]: defaultValue });
      } else if (field.kind !== 'object') Object.assign(data, Object.assign(data, { [field.name]: null }));
    }
  });

  return data as Item;
};

export function updateMany(args: UpdateArgs, current: Delegate, delegates: Delegates, onChange: (items: Item[]) => void) {
  const { toUpdate, updated } = current.getItems().reduce(
    (accumulator: UpdateMap, currentValue: Item) => {
      const shouldUpdate = where(args.where, current, delegates)(currentValue);

      if (shouldUpdate) {
        const baseValue = {
          ...currentValue,
          ...removeUndefined(update(args, false, currentValue, current, delegates)),
        };

        const updated = pipe(includes(args, current, delegates), select(args.select))(baseValue);

        return {
          toUpdate: [...accumulator.toUpdate, updated],
          updated: [...accumulator.updated, baseValue],
        };
      }
      return {
        toUpdate: accumulator.toUpdate,
        updated: [...accumulator.updated, currentValue],
      };
    },
    { toUpdate: [], updated: [] },
  );

  onChange(updated);

  return toUpdate;
}
