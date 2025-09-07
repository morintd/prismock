import { Delegates } from '../prismock';
import { Item, Delegate } from '../delegate';
import { FindWhereArgs, SelectArgs } from '../types';
import { pipe } from '../helpers';
import { relationshipStore } from '../client';

import { getDelegateFromField, getFieldFromRelationshipWhere, getJoinField, includes, select, where } from './find';

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
      const deleted = pipe(includes(args, current, delegates), select(args.select))(currentValue);

      if (shouldDelete) {
        return {
          toDelete: [...accumulator.toDelete, deleted],
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
      relationshipStore.cleanupRelationships({ type: field.type, id: (args?.where as { id: number })?.id });

      const joinField = getJoinField(field, delegates);
      if (!joinField) return;

      const delegate = getDelegateFromField(field, delegates);

      if (joinField.relationOnDelete === 'SetNull') {
        delegate.updateMany({
          where: getFieldFromRelationshipWhere(item, joinField),
          data: {
            [joinField.relationFromFields![0]]: null,
          },
        });
      } else if (joinField.relationOnDelete === 'Cascade') {
        delegate.deleteMany({
          where: getFieldFromRelationshipWhere(item, joinField),
        });
      }
    });
  });

  return toDelete;
}
