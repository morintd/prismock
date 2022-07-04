import { Data } from '../prismock';
import { Item, DelegateContext } from '../delegate';
import { FindWhereArgs, SelectArgs } from '../types';
import { camelize } from '../helpers';

import { getJoinField, where } from './find';
import { updateMany } from './update';

export type DeleteArgs = {
  select?: SelectArgs | null;
  include?: Record<string, boolean> | null;
  where?: FindWhereArgs;
};

export type DeletionMap = {
  toDelete: Item[];
  withoutDeleted: Item[];
};

export function deleteMany(data: Data, name: string, args: DeleteArgs, context: DelegateContext) {
  const { toDelete, withoutDeleted } = data[name].reduce(
    (accumulator: DeletionMap, currentValue: Item) => {
      const shouldDelete = where(args.where, context)(currentValue);

      if (shouldDelete) {
        return {
          toDelete: [...accumulator.toDelete, currentValue],
          withoutDeleted: accumulator.withoutDeleted,
        };
      }

      return {
        toDelete: accumulator.toDelete,
        withoutDeleted: [...accumulator.withoutDeleted, currentValue],
      };
    },
    { toDelete: [], withoutDeleted: [] },
  );

  Object.assign(data, {
    [name]: withoutDeleted,
  });

  toDelete.forEach((item: Item) => {
    context.model.fields.forEach((field) => {
      const joinfield = getJoinField(field, context);
      if (!joinfield) return;

      const delegateName = camelize(field.type);
      const contextInvolved: DelegateContext = {
        ...context,
        model: context.models.find((model) => {
          return model.name === delegateName;
        })!,
        name: delegateName,
      };

      if (joinfield.relationOnDelete === 'SetNull') {
        updateMany(
          data,
          delegateName,
          {
            where: {
              [joinfield.relationFromFields![0]]: item[joinfield.relationToFields![0]],
            } as any,
            data: {
              [joinfield.relationFromFields![0]]: null,
            },
          },
          contextInvolved,
        );
      } else if (joinfield.relationOnDelete === 'Cascade') {
        deleteMany(
          data,
          delegateName,
          {
            where: {
              [joinfield.relationFromFields![0]]: item[joinfield.relationToFields![0]],
            } as any,
          },
          contextInvolved,
        );
      }
    });
  });

  return toDelete;
}
