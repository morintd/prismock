import { DelegateContext, Item } from '../delegate';
import { camelize, omit } from '../helpers';
import { Data } from '../prismock';
import { FindWhereArgs, SelectArgs } from '../types';

import { calculateDefaultFieldValue, create } from './create';
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

const nestedUpdate = (args: UpdateArgs, isCreating: boolean, item: Item, context: DelegateContext) => {
  let d: any = args.data;

  context.model.fields.forEach((field) => {
    if (d[field.name]) {
      const c = d[field.name];

      if (field.kind === 'object') {
        if (c.connect) {
          const connect = d[field.name];

          d = omit(d, field.name);

          const connectedModelName = camelize(field.type);
          const connectedModel = context.models.find((m) => m.name === field.type)!;
          const connectedContext: DelegateContext = {
            data: context.data,
            model: connectedModel,
            name: connectedModelName,
            models: context.models,
            properties: context.properties,
          };
          const connectedField = connectedModel.fields.find((f) => f.relationName === field.relationName)!;
          const connectedValue = connect.connect[connectedField.relationToFields![0]];

          updateMany(
            connectedContext.data,
            connectedModelName,
            {
              where: { [connectedField.relationToFields![0]]: connectedValue },
              data: { [connectedField.relationFromFields![0]]: args.where[connectedField.relationToFields![0]] },
            },
            connectedContext,
          );
        }
        if (c.create || c.createMany) {
          const toCreate = d[field.name];

          d = omit(d, field.name);

          const delegateName = camelize(field.type);
          const contextInvolved: DelegateContext = {
            ...context,
            model: context.models.find((model) => {
              return model.name === field.type;
            })!,
            name: delegateName,
          };

          const joinfield = getJoinField(field, contextInvolved);
          if (field.relationFromFields?.[0]) {
            create(
              contextInvolved.data,
              delegateName,
              contextInvolved.properties[delegateName],
              d[field.name].create,
              contextInvolved,
            );
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
                      val = findOne(contextInvolved.data[delegateName], args, contextInvolved)?.[cur];
                    }
                    return Object.assign(Object.assign({}, prev), { [cur]: val });
                  }, {}),
                },
              });
            if (c.createMany) {
              Object.assign(Object.assign({}, c.createMany), { data: c.createMany })
                .data.map(map)
                .forEach((createSingle: Item) =>
                  create(
                    contextInvolved.data,
                    delegateName,
                    contextInvolved.properties[delegateName],
                    createSingle,
                    contextInvolved,
                  ),
                );
            } else {
              if (Array.isArray(c.create)) {
                Object.assign(Object.assign({}, c.create), { data: c.createMany })
                  .data.map(map)
                  .forEach((createSingle: Item) =>
                    create(
                      contextInvolved.data,
                      delegateName,
                      contextInvolved.properties[delegateName],
                      createSingle,
                      contextInvolved,
                    ),
                  );
              } else {
                const createData = Object.assign({}, toCreate.create);
                if (joinfield) {
                  Object.assign(createData, {
                    [joinfield.relationFromFields![0]]: map(toCreate.create)[joinfield.name].connect[
                      joinfield.relationToFields![0]
                    ],
                  });
                }

                create(
                  contextInvolved.data,
                  delegateName,
                  contextInvolved.properties[delegateName],
                  createData,
                  contextInvolved,
                );
              }
            }
          }
        }
        if (c.update || c.updateMany) {
          const connectedField = getJoinField(field, context);
          const where = {};

          if (connectedField) {
            Object.assign(where, {
              [connectedField.relationFromFields![0]]: args.where[connectedField.relationToFields![0]],
            });
          }

          d = omit(d, field.name);

          const contextInvolved: DelegateContext = {
            ...context,
            model: context.models.find((model) => {
              return model.name === field.type;
            })!,
            name: camelize(field.type),
          };

          if (c.updateMany) {
            Object.assign(where, c.updateMany.where);

            if (Array.isArray(c.updateMany)) {
              c.updateMany.forEach(({ data }: UpdateArgs) => {
                updateMany(contextInvolved.data, contextInvolved.name, { where, data }, contextInvolved);
              });
            } else {
              updateMany(contextInvolved.data, contextInvolved.name, { where, data: c.updateMany.data }, contextInvolved);
            }
          } else {
            Object.assign(where, c.update.where);

            if (Array.isArray(c.update)) {
              c.update.forEach(({ data }: UpdateArgs) => {
                updateMany(contextInvolved.data, contextInvolved.name, { where, data }, contextInvolved);
              });
            } else {
              const item = findOne(contextInvolved.data[contextInvolved.name], args, contextInvolved)!;

              updateMany(
                contextInvolved.data,
                contextInvolved.name,
                { where: getFieldRelationshipWhere(item, field, contextInvolved), data: c.update.data },
                contextInvolved,
              );
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
        const defaultValue = calculateDefaultFieldValue(field, context.properties[context.name]);
        if (defaultValue !== undefined && !d[field.name]) Object.assign(d, { [field.name]: defaultValue });
      } else if (field.kind !== 'object') Object.assign(d, Object.assign(Object.assign({}, d), { [field.name]: null }));
    }
  });

  return d as Item;
};

export function updateMany(data: Data, name: string, args: UpdateArgs, context: DelegateContext) {
  const { toUpdate, updated } = data[name].reduce(
    (accumulator: UpdateMap, currentValue: Item) => {
      const shouldUpdate = where(args.where, context)(currentValue);

      if (shouldUpdate) {
        const v = currentValue;
        const n = nestedUpdate(args, false, currentValue, context);

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

  Object.assign(data, { [name]: updated });

  return toUpdate;
}
