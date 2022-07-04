import path from 'path';

import { DMMF } from '@prisma/generator-helper';
import { getDMMF, getSchemaSync } from '@prisma/internals';

import { camelize, isAutoIncrement } from './operations';
import { Delegate, DelegateProperties, generateDelegate, Item } from './delegate';
import { generateClient } from './client';

type Options = {
  schemaPath?: string;
};

export type Data = Record<string, Item[]>;

async function generateDMMF(schemaPath?: string) {
  const pathToModule = schemaPath ?? require.resolve(path.resolve(process.cwd(), 'prisma/schema.prisma'));
  return getDMMF({ datamodel: getSchemaSync(pathToModule) });
}

export async function generatePrismock(options: Options = {}) {
  const schema = await generateDMMF(options.schemaPath);
  const { models } = schema.datamodel;

  const data: Data = {};
  const properties: Record<string, DelegateProperties> = {};

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

  const delegates = models.reduce((accumulator: Record<string, Delegate>, model) => {
    const name = camelize(model.name);
    data[name] = [];
    properties[name] = {
      increment: {},
    };

    accumulator[name] = generateDelegate(models, model, name, data, properties);
    return accumulator;
  }, {});

  return generateClient(delegates, getData, setData);
}
