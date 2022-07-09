# prismock

[![npm](https://img.shields.io/npm/v/prismock)](https://www.npmjs.com/package/prismock)
[![Build](https://circleci.com/gh/morintd/prismock.svg?style=shield)](https://app.circleci.com/pipelines/github/morintd/prismock)
[![npm](https://img.shields.io/npm/dm/prismock)](https://www.npmjs.com/package/prismock)

This is a mock for `PrismaClient`. It actually reads your `schema.prisma` and generate models based on it.

It perfectly simulates Prisma's API and store everything in-memory for fast, isolated, and retry-able unit tests.

# Installation

After setting up [Prisma](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project):

yarn

```sh
$ yarn add -D prismock
```

npm

```
$ npm add --save-dev prismock
```

# Usage

There is two options here, depending on your application architecture.

## PrismaClient

You can mock the PrismaClient directly:

```ts
import { PrismaClient } from '@prisma/client';
import { generatePrismock } from 'prismock';

jest.mock('@prisma/client', () => {
  return {
    ...jest.requireActual('@prisma/client'),
    PrismaClient: jest.fn(),
  };
});

beforeAll(async () => {
  const prismock = await generatePrismock();
  (PrismaClient as jest.Mock).mockReturnValue(prismock);
});
```

## Dependency injection

If you are using dependency injection, you can directly use `prismock`. I personally do so with the amazing [NestJS](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing):

```ts
import { generatePrismock } from 'prismock';

let app: INestApplication;

beforeAll(async () => {
  const prismock = await generatePrismock();

  const moduleRef = await Test.createTestingModule({ imports: [] })
    .overrideProvider(PrismaService)
    .useValue(prismock)
    .compile();

  app = moduleRef.createNestApplication();
  await app.init();
});
```

Then, you will be able to write your tests as if your app was using an in-memory Prisma client.

# API

```ts
generatePrismock(
  pathToSchema?: string,
): Promise<PrismaClient>
```

The returned object is similar to a PrismaClient, which can be used as-is.

## pathToSchema

Path to the schema file. If not provided, the schema is `prisma/schema.prisma`.

## Internal data

Two additional functions are returned with the PrismaClient, `getData` and `setData`. In some edge-case, we need to directly access, or change, the data store management by _prismock_.

Most of the time, you won't need it in your test, but keep in mind they exist

```ts
const prismock = await generatePrismock();
prismock.setData({ user: [] });
```

```ts
const prismock = await generatePrismock();
prismock.getData(); // { user: [] }
```

# Supported features

## Model queries

| Feature    | State |
| ---------- | ----- |
| findUnique | ✔     |
| findFirst  | ✔     |
| findMany   | ✔     |
| create     | ✔     |
| createMany | ✔     |
| delete     | ✔     |
| deleteMany | ✔     |
| update     | ✔     |
| updateMany | ✔     |
| upsert     | ✔     |
| count      | ✔     |
| aggregate  | ⛔    |
| groupBy    | ⛔    |

## Model query options

| Feature        | State |
| -------------- | ----- |
| distinct       | ✔     |
| include        | ✔     |
| where          | ✔     |
| select         | ✔     |
| orderBy        | ⛔    |
| select + count | ⛔    |

## Nested queries

| Feature         | State |
| --------------- | ----- |
| create          | ✔     |
| createMany      | ✔     |
| update          | ✔     |
| updateMany      | ✔     |
| connect         | ✔     |
| set             | ⛔    |
| disconnect      | ⛔    |
| connectOrCreate | ⛔    |
| upsert          | ⛔    |
| delete          | ⛔    |

## Filter conditions and operators

| Feature   | State |
| --------- | ----- |
| equals    | ✔     |
| gt        | ✔     |
| gte       | ✔     |
| lt        | ✔     |
| lte       | ✔     |
| not       | ✔     |
| in        | ✔     |
| notIn     | ✔     |
| contains  | ✔     |
| startWith | ✔     |
| endsWith  | ✔     |
| AND       | ✔     |
| OR        | ✔     |
| NOT       | ✔     |
| search    | ⛔    |
| mode      | ⛔    |

## Relation filters

| Feature | State |
| ------- | ----- |
| some    | ✔     |
| every   | ✔     |
| none    | ✔     |
| is      | ⛔    |

## Scalar list methods

| Feature | State |
| ------- | ----- |
| set     | ⛔    |
| push    | ⛔    |

## Scalar list filters

| Feature  | State |
| -------- | ----- |
| has      | ⛔    |
| hasEvery | ⛔    |
| hasSome  | ⛔    |
| isEmpty  | ⛔    |
| equals   | ⛔    |

## Atomic number operations

| Feature   | State |
| --------- | ----- |
| increment | ✔     |
| decrement | ✔     |
| multiply  | ✔     |
| divide    | ✔     |
| set       | ✔     |

## JSON filters

| Feature             | State |
| ------------------- | ----- |
| path                | ⛔    |
| string_contains     | ⛔    |
| string_starts_withn | ⛔    |
| string_ends_with    | ⛔    |
| array_contains      | ⛔    |
| array_starts_with   | ⛔    |
| array_ends_with     | ⛔    |

## Attributes

| Feature    | State |
| ---------- | ----- |
| @@id       | ✔     |
| @default   | ✔     |
| @relation  | ✔     |
| @unique    | ⛔    |
| @@unique   | ⛔    |
| @updatedAt | ⛔    |

## Attribute functions

| Feature         | State |
| --------------- | ----- |
| autoincrement() | ✔     |
| now()           | ✔     |
| auto()          | ⛔    |
| cuid()          | ⛔    |
| uuid()          | ⛔    |
| dbgenerated     | ⛔    |

## Referential actions

| Feature                                     | State |
| ------------------------------------------- | ----- |
| onDelete (SetNull, Cascade)                 | ✔     |
| onDelete (Restrict, NoAction, SetDefault)() | ⛔    |
| onUpdate                                    | ⛔    |

# Roadmap

- Complete supported features.
- Configure stricter TypesScript/ESLint rules.
- Refactor delegates with a better, object oriented, approach.
- Add more tests for edge-cases.

# Credit

Based on [prisma-mock](https://www.npmjs.com/package/prisma-mock).
