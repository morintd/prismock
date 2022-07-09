import path from 'path';

import { DMMF } from '@prisma/generator-helper';
import { getDMMF, getSchemaSync } from '@prisma/internals';

import { camelize, isAutoIncrement, omit } from './operations';
import { Delegate, DelegateProperties, generateDelegate, Item } from './delegate';
import { generateClient } from './client';

type Options = {
  schemaPath?: string;
};

export type Data = Record<string, Item[]>;
export type Properties = Record<string, DelegateProperties>;
export type Delegates = Record<string, Delegate>;

async function generateDMMF(schemaPath?: string) {
  const pathToModule = schemaPath ?? require.resolve(path.resolve(process.cwd(), 'prisma/schema.prisma'));
  return getDMMF({ datamodel: getSchemaSync(pathToModule) });
}

export async function generatePrismock(options: Options = {}) {
  const schema = await generateDMMF(options.schemaPath);
  const { models } = schema.datamodel;

  const data: Data = {};
  const properties: Properties = {};
  const delegates: Delegates = {};

  function getData() {
    return data;
  }

  function setData(d: Data) {
    Object.assign(data, d);
    Object.assign(
      properties,
      Object.entries(d).reduce((accumulator, [currentKey]) => {
        const model = models.find((m) => camelize(m.name) === currentKey) as DMMF.Model;
        return {
          ...accumulator,
          [currentKey]: {
            increment: model.fields.reduce((propertiesAccumulator: Record<string, number>, currentField) => {
              if (isAutoIncrement(currentField)) {
                return { ...propertiesAccumulator, [currentField.name]: d[currentKey].length };
              }
              return propertiesAccumulator;
            }, {}),
          },
        };
      }, {}),
    );
  }

  models.forEach((model) => {
    const name = camelize(model.name);
    data[name] = [];
    properties[name] = {
      increment: {},
    };

    Object.assign(delegates, {
      [name]: generateDelegate(model, data, name, properties[name], delegates, (items) => {
        Object.assign(data, { [name]: items });
      }),
    });
  }, {});

  const clientDelegates = Object.entries(delegates).reduce((accumulator, [delegateKey, delegateValue]) => {
    return {
      ...accumulator,
      [delegateKey]: omit(delegateValue, ['model', 'properties', 'getItems']) as Delegate,
    };
  }, {} as Delegates);

  return generateClient(clientDelegates, getData, setData);
}
