import { Prisma } from '@prisma/client';
import { DMMF } from '@prisma/client/runtime/library';

import { Delegate, Item } from '../../delegate';
import { camelize, shallowCompare } from '../../helpers';
import { Delegates } from '../../prismock';
import { FindWhereArgs } from '../../types';
import { relationshipStore } from '../../client';

import { getFieldRelationshipWhere } from './find';

function formatValueWithMode<T>(baseValue: T, filter: Prisma.Enumerable<FindWhereArgs>, info?: DMMF.Field | null) {
  const format =
    'mode' in filter
      ? <T>(baseValue: T) => (typeof baseValue === 'string' ? (baseValue.toLocaleLowerCase() as T) : baseValue)
      : <T>(v: T) => v;
  if (info?.type === 'DateTime' && typeof baseValue === 'string') {
    return new Date(baseValue);
  }
  if (info?.type === 'BigInt' && typeof baseValue === 'number') {
    return BigInt(baseValue);
  }
  return format(baseValue);
}

export const matchMultiple = (item: Item, where: FindWhereArgs, current: Delegate, delegates: Delegates) => {
  const matchAnd = (item: Record<string, unknown>, where: FindWhereArgs[]) => {
    return where.filter((child) => matchMultiple(item, child, current, delegates)).length === where.length;
  };

  const matchOr = (item: Item, where: FindWhereArgs[]) => {
    return where.some((child) => matchMultiple(item, child, current, delegates));
  };

  const matchFnc =
    (where: FindWhereArgs, delegate = current) =>
    (item: Record<string, unknown>) => {
      if (where) {
        return matchMultiple(item, where, delegate, delegates);
      }
      return true;
    };

  function match(child: string, item: Item, where: FindWhereArgs) {
    let val: any = item[child];
    const filter = where[child] as Prisma.Enumerable<FindWhereArgs>;
    const relationMatch = relationshipStore.match({
      type: current.model.name,
      name: child,
      itemId: item.id as number,
      where: where[child] as FindWhereArgs,
    });

    if (relationMatch) {
      return relationMatch > 0;
    }
    if (child === 'OR') return matchOr(item, filter as FindWhereArgs[]);
    if (child === 'AND') return matchAnd(item, filter as FindWhereArgs[]);
    if (child === 'NOT') return !matchOr(item, filter instanceof Array ? filter : [filter]);
    if (child === 'is') {
      if (typeof filter === 'object') {
        return matchFnc(filter as FindWhereArgs)(item);
      }
      return false;
    }

    if (filter === undefined) {
      return true;
    }

    if (filter === null) {
      const field = current.model.fields.find((field) => field.name === child);

      if (field?.relationFromFields && field.relationFromFields.length > 0) {
        return item[field.relationFromFields[0]] === null || item[field.relationFromFields[0]] === undefined;
      }
      return val === null || val === undefined;
    }

    // Support querying fields with bigint in query.
    if (typeof filter === 'bigint') {
      if (filter === BigInt(val)) {
        return true;
      }
    }

    if (filter instanceof Date) {
      if (val === undefined) {
        return false;
      }
      if (!(val instanceof Date) || val.getTime() !== filter.getTime()) {
        return false;
      }
    } else {
      if (typeof filter === 'object') {
        const info = current.model.fields.find((field) => field.name === child);
        val = formatValueWithMode(val, filter, info);
        if (info?.relationName) {
          const childName = camelize(info.type);
          let childWhere: any = {};
          if (filter.every) {
            childWhere = filter.every;
          } else if (filter.some) {
            childWhere = filter.some;
          } else if ((filter as FindWhereArgs).none) {
            childWhere = (filter as FindWhereArgs).none;
          } else {
            childWhere = filter;
          }
          const res = delegates[childName]
            .getItems()
            .filter(
              matchFnc(
                Object.assign(Object.assign({}, childWhere), getFieldRelationshipWhere(item, info, delegates)),
                delegates[childName],
              ),
            );

          if (filter.every) {
            if (res.length === 0) return false;
            const all = delegates[childName].getItems().filter(matchFnc(getFieldRelationshipWhere(item, info, delegates)));
            return res.length === all.length;
          } else if (filter.some) {
            return res.length > 0;
          } else if ((filter as FindWhereArgs).is === null) {
            return res.length === 0;
          } else if ((filter as FindWhereArgs).none) {
            return res.length === 0;
          }
          return res.length > 0;
        }

        const compositeIndex =
          current.model.uniqueIndexes.map((index) => index.name).includes(child) ||
          current.model.primaryKey?.name === child ||
          current.model.primaryKey?.fields.join('_');

        if (compositeIndex) {
          return matchMultiple(item, where[child] as FindWhereArgs, current, delegates);
        }

        const idFields = current.model.fields.map((field) => field.isId);

        if (idFields?.length > 1) {
          if (child === idFields.join('_')) {
            return shallowCompare(item, filter as FindWhereArgs);
          }
        }

        if (current.model.uniqueFields.length > 0) {
          for (const uniqueField of current.model.uniqueFields) {
            if (child === uniqueField.join('_')) {
              return shallowCompare(item, filter as FindWhereArgs);
            }
          }
        }
        if (val === undefined) return false;

        let match = true;
        if ('equals' in filter && match) {
          match = formatValueWithMode(filter.equals, filter, info) === val;
        }
        if ('startsWith' in filter && match) {
          match = val.indexOf(formatValueWithMode(filter.startsWith, filter, info)) === 0;
        }
        if ('endsWith' in filter && match) {
          match =
            val.indexOf(formatValueWithMode(filter.endsWith, filter, info)) === val.length - (filter as any).endsWith.length;
        }
        if ('contains' in filter && match) {
          match = val.indexOf(formatValueWithMode(filter.contains, filter, info)) > -1;
        }
        if ('gt' in filter && match) {
          match = val > formatValueWithMode(filter.gt, filter, info)!;
        }
        if ('gte' in filter && match) {
          match = val >= formatValueWithMode(filter.gte, filter, info)!;
        }
        if ('lt' in filter && match) {
          match = val !== null && val < formatValueWithMode(filter.lt, filter, info)!;
        }
        if ('lte' in filter && match) {
          match = val !== null && val <= formatValueWithMode(filter.lte, filter, info)!;
        }
        if ('in' in filter && match) {
          match = (filter.in as any[]).map((inEntry) => formatValueWithMode(inEntry, filter, info)).includes(val);
        }
        if ('not' in filter && match) {
          match = val !== formatValueWithMode(filter.not, filter);
        }
        if ('notIn' in filter && match) {
          match = !(filter.notIn as any[]).map((notInEntry) => formatValueWithMode(notInEntry, filter, info)).includes(val);
        }
        if (!match) return false;
      } else if (val !== filter) {
        return false;
      }
    }
    return true;
  }

  for (const child in where) {
    if (!match(child, item, where)) {
      return false;
    }
  }
  return true;
};
