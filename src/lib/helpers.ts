import { Item } from './delegate';

export function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

export function shallowCompare(a: Item, b: Item) {
  for (const key in b) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function omit(obj: Record<string, unknown>, key: string) {
  return Object.entries(obj).reduce((accumulator, [currentKey, currentValue]) => {
    if (currentKey !== key) {
      accumulator = { ...accumulator, [currentKey]: currentValue };
    }
    return accumulator;
  }, {});
}
