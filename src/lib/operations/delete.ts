import { Delegates } from '../prismock';
import { Item, Delegate } from '../delegate';
import { FindWhereArgs, SelectArgs } from '../types';
import { camelize } from '../helpers';

import { getJoinField, where } from './find';

export type DeleteArgs = {
  select?: SelectArgs | null;
  include?: Record<string, boolean> | null;
  where?: FindWhereArgs;
};

export type DeletionMap = {
  toDelete: Item[];
  withoutDeleted: Item[];
};

export function deleteMany(args: DeleteArgs, current: Delegate, delegates: Delegates, onChange: (items: Item[]) => void) {
  const { toDelete, withoutDeleted } = current.getItems().reduce(
    (accumulator: DeletionMap, currentValue: Item) => {
      const shouldDelete = where(args.where, current, delegates)(currentValue);

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

  onChange(withoutDeleted);

  toDelete.forEach((item: Item) => {
    current.model.fields.forEach((field) => {
      const joinfield = getJoinField(field, delegates);
      if (!joinfield) return;

      const delegateName = camelize(field.type);
      const delegate = delegates[delegateName];

      if (joinfield.relationOnDelete === 'SetNull') {
        delegate.updateMany({
          where: {
            [joinfield.relationFromFields![0]]: item[joinfield.relationToFields![0]],
          } as any,
          data: {
            [joinfield.relationFromFields![0]]: null,
          },
        });
      } else if (joinfield.relationOnDelete === 'Cascade') {
        delegate.deleteMany({
          where: {
            [joinfield.relationFromFields![0]]: item[joinfield.relationToFields![0]],
          } as any,
        });
      }
    });
  });

  return toDelete;
}
