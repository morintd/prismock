import { Delegate, Item } from '../delegate';
import { camelize, omit } from '../helpers';
import { Delegates } from '../prismock';
import { FindWhereArgs, SelectArgs } from '../types';

import { calculateDefaultFieldValue } from './create';
import { findOne, getFieldRelationshipWhere, getJoinField, where } from './find';

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

const nestedUpdate = (args: UpdateArgs, isCreating: boolean, item: Item, current: Delegate, delegates: Delegates) => {
  let d: any = args.data;

  current.model.fields.forEach((field) => {
    if (d[field.name]) {
      const c = d[field.name];

      if (field.kind === 'object') {
        if (c.connect) {
          const connect = d[field.name];

          d = omit(d, [field.name]);

          const delegate = delegates[camelize(field.type)];
          const joinfield = getJoinField(field, delegates)!;
          const joinValue = connect.connect[joinfield.relationToFields![0]];

          delegate.updateMany({
            where: { [joinfield.relationToFields![0]]: joinValue },
            data: { [joinfield.relationFromFields![0]]: args.where[joinfield.relationToFields![0]] },
          });
        }
        if (c.create || c.createMany) {
          const toCreate = d[field.name];

          d = omit(d, [field.name]);

          const delegateName = camelize(field.type);
          const delegate = delegates[delegateName];

          const joinfield = getJoinField(field, delegates);
          if (field.relationFromFields?.[0]) {
            delegate.create(d[field.name].create);
            d = Object.assign(d, {
              [field.relationFromFields[0]]: item[field.relationToFields![0]],
            });
          } else {
            const map = (val: Item) =>
              Object.assign(Object.assign({}, val), {
                [joinfield!.name]: {
                  connect: joinfield!.relationToFields!.reduce((prev, cur) => {
                    let val = d[cur];
                    if (!isCreating && !val) {
                      val = findOne(args, delegate, delegates)?.[cur];
                    }
                    return Object.assign(Object.assign({}, prev), { [cur]: val });
                  }, {}),
                },
              });
            if (c.createMany) {
              Object.assign(Object.assign({}, c.createMany), { data: c.createMany })
                .data.map(map)
                .forEach((createSingle: Item) => delegate.create({ data: createSingle }));
            } else {
              if (Array.isArray(c.create)) {
                Object.assign(Object.assign({}, c.create), { data: c.createMany })
                  .data.map(map)
                  .forEach((createSingle: Item) => delegate.create({ data: createSingle }));
              } else {
                const createData = Object.assign({}, toCreate.create);
                if (joinfield) {
                  Object.assign(createData, {
                    [joinfield.relationFromFields![0]]: map(toCreate.create)[joinfield.name].connect[
                      joinfield.relationToFields![0]
                    ],
                  });
                }

                delegate.create({ data: createData });
              }
            }
          }
        }
        if (c.update || c.updateMany) {
          const connectedField = getJoinField(field, delegates);
          const where = {};

          if (connectedField) {
            Object.assign(where, {
              [connectedField.relationFromFields![0]]: args.where[connectedField.relationToFields![0]],
            });
          }

          d = omit(d, [field.name]);

          const delegate = delegates[camelize(field.type)];

          if (c.updateMany) {
            Object.assign(where, c.updateMany.where);

            if (Array.isArray(c.updateMany)) {
              c.updateMany.forEach(({ data }: UpdateArgs) => {
                delegate.updateMany({ where, data });
              });
            } else {
              delegate.updateMany({ where, data: c.updateMany.data });
            }
          } else {
            Object.assign(where, c.update.where);

            if (Array.isArray(c.update)) {
              c.update.forEach(({ data }: UpdateArgs) => {
                delegate.updateMany({ where, data });
              });
            } else {
              const item = findOne(args, delegate, delegates)!;

              delegate.updateMany({ where: getFieldRelationshipWhere(item, field, delegates), data: c.update.data });
            }
          }
        }
      }
      if (c.increment) {
        d = Object.assign(Object.assign({}, d), { [field.name]: (item[field.name] as number) + (c.increment as number) });
      }
      if (c.decrement) {
        d = Object.assign(Object.assign({}, d), { [field.name]: (item[field.name] as number) - c.decrement });
      }
      if (c.multiply) {
        d = Object.assign(Object.assign({}, d), { [field.name]: (item[field.name] as number) * c.multiply });
      }
      if (c.divide) {
        d = Object.assign(Object.assign({}, d), { [field.name]: (item[field.name] as number) / c.divide });
      }
      if (c.set) {
        d = Object.assign(Object.assign({}, d), { [field.name]: c.set });
      }
    }

    if ((isCreating || d[field.name] === null) && (d[field.name] === null || d[field.name] === undefined)) {
      if (field.hasDefaultValue) {
        const defaultValue = calculateDefaultFieldValue(field, current.getProperties());
        if (defaultValue !== undefined && !d[field.name]) Object.assign(d, { [field.name]: defaultValue });
      } else if (field.kind !== 'object') Object.assign(d, Object.assign(Object.assign({}, d), { [field.name]: null }));
    }
  });

  return d as Item;
};

export function updateMany(args: UpdateArgs, current: Delegate, delegates: Delegates, onChange: (items: Item[]) => void) {
  const { toUpdate, updated } = current.getItems().reduce(
    (accumulator: UpdateMap, currentValue: Item) => {
      const shouldUpdate = where(args.where, current, delegates)(currentValue);

      if (shouldUpdate) {
        const v = currentValue;
        const n = nestedUpdate(args, false, currentValue, current, delegates);

        const updatedValue = { ...v, ...n };

        return {
          toUpdate: [...accumulator.toUpdate, updatedValue],
          updated: [...accumulator.updated, updatedValue],
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
