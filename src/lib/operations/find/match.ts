import { Prisma } from '@prisma/client';

import { Delegate, Item } from '../../delegate';
import { camelize, shallowCompare } from '../../helpers';
import { Delegates } from '../../prismock';
import { FindWhereArgs } from '../../types';

import { getFieldRelationshipWhere } from './find';

function formatValueWithMode<T>(baseValue: T, filter: Prisma.Enumerable<FindWhereArgs>) {
  const format =
    'mode' in filter
      ? <T>(baseValue: T) => (typeof baseValue === 'string' ? (baseValue.toLocaleLowerCase() as T) : baseValue)
      : <T>(v: T) => v;

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

    if (child === 'OR') return matchOr(item, filter as FindWhereArgs[]);
    if (child === 'AND') return matchAnd(item, filter as FindWhereArgs[]);
    if (child === 'NOT') return !matchOr(item, filter as FindWhereArgs[]);

    if (filter == null || filter === undefined) {
      if (filter === null) return val === null || val === undefined;
      return true;
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
        val = formatValueWithMode(val, filter);

        const info = current.model.fields.find((field) => field.name === child);
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
          const res = delegates[childName]!.getItems().filter(
            matchFnc(
              Object.assign(Object.assign({}, childWhere), getFieldRelationshipWhere(item, info, delegates)),
              delegates[childName],
            ),
          );

          if (filter.every) {
            if (res.length === 0) return false;
            const all = delegates[childName]!.getItems().filter(matchFnc(getFieldRelationshipWhere(item, info, delegates)));
            return res.length === all.length;
          } else if (filter.some) {
            return res.length > 0;
          } else if ((filter as FindWhereArgs).none) {
            return res.length === 0;
          }
          return res.length > 0;
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
          match = formatValueWithMode(filter.equals, filter) === val;
        }
        if ('startsWith' in filter && match) {
          match = val.indexOf(formatValueWithMode(filter.startsWith, filter)) === 0;
        }
        if ('endsWith' in filter && match) {
          match = val.indexOf(formatValueWithMode(filter.endsWith, filter)) === val.length - (filter as any).endsWith.length;
        }
        if ('contains' in filter && match) {
          match = val.indexOf(formatValueWithMode(filter.contains, filter)) > -1;
        }
        if ('gt' in filter && match) {
          match = val > formatValueWithMode(filter.gt, filter)!;
        }
        if ('gte' in filter && match) {
          match = val >= formatValueWithMode(filter.gte, filter)!;
        }
        if ('lt' in filter && match) {
          match = val < formatValueWithMode(filter.lt, filter)!;
        }
        if ('lte' in filter && match) {
          match = val <= formatValueWithMode(filter.lte, filter)!;
        }
        if ('in' in filter && match) {
          match = (filter.in as any[]).map((inEntry) => formatValueWithMode(inEntry, filter)).includes(val);
        }
        if ('not' in filter && match) {
          match = val !== formatValueWithMode(filter.not, filter);
        }
        if ('notIn' in filter && match) {
          match = !(filter.notIn as any[]).map((notInEntry) => formatValueWithMode(notInEntry, filter)).includes(val);
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
