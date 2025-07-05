import path from 'path';

import { PrismaClient } from '@prisma/client';
import { DMMF } from '@prisma/generator-helper';
import { getDMMF } from '@prisma/internals/dist/engine-commands/getDmmf';
import { Generator } from '@prisma/internals/dist/Generator';
import { getGenerator } from '@prisma/internals/dist/get-generators/getGenerators';
import { getSchema } from '@prisma/internals/dist/cli/getSchema';

import { isAutoIncrement } from './operations';
import { Delegate, DelegateProperties, generateDelegate, Item } from './delegate';
import { generateClient, PrismockClientType } from './client';
import { camelize, omit } from './helpers';

type Options = {
  schemaPath?: string;
};

type OptionsSync = {
  models: DMMF.Model[];
};

export type Data = Record<string, Item[]>;
export type Properties = Record<string, DelegateProperties>;
export type Delegates = Record<string, Delegate>;
export type RelationshipStore = Record<string, Array<{ fromId: string | number; toId: string | number }>>;

export async function generateDMMF(schemaPath?: string) {
  const pathToModule = schemaPath ?? require.resolve(path.resolve(process.cwd(), 'prisma/schema.prisma'));
  const datamodel = await getSchema(pathToModule);
  return getDMMF({ datamodel });
}

export async function fetchGenerator(schemaPath?: string) {
  const pathToModule = schemaPath ?? require.resolve(path.resolve(process.cwd(), 'prisma/schema.prisma'));
  return getGenerator({
    schemaPath: pathToModule,
  });
}

export function getProvider(generator: Generator) {
  return generator.options?.datasources[0].activeProvider;
}

export async function generatePrismock<T = PrismaClient>(options: Options = {}): Promise<PrismockClientType<T>> {
  const schema = await generateDMMF(options.schemaPath);
  return generatePrismockSync<T>({ models: schema.datamodel.models as DMMF.Model[] });
}

export function generatePrismockSync<T = PrismockClientType>(options: OptionsSync): PrismockClientType<T> {
  const { delegates, getData, setData } = generateDelegates(options);
  return generateClient<T>(delegates, getData, setData);
}

export function generateDelegates(options: OptionsSync) {
  const models = options.models ?? [];
  const data: Data = {};
  const properties: Properties = {};
  const delegates: Delegates = {};
  const relationshipStore: RelationshipStore = {};

  function getData() {
    return data;
  }

  function setData(d: Data) {
    // eslint-disable-next-line no-console
    console.log(
      'Deprecation notice: setData will be removed in a future version and should not be used anymore. Please use a mix of "reset" and create/createMany to achieve the same result',
    );

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
      [name]: generateDelegate(model, data, name, properties, delegates, relationshipStore, (items) => {
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

  return { delegates: clientDelegates, getData, setData };
}
