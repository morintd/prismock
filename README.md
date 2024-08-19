# prismock

[![npm](https://img.shields.io/npm/v/prismock)](https://www.npmjs.com/package/prismock)
[![Build](https://circleci.com/gh/morintd/prismock.svg?style=shield)](https://app.circleci.com/pipelines/github/morintd/prismock)
[![npm](https://img.shields.io/npm/dm/prismock)](https://www.npmjs.com/package/prismock)

This is a mock for `PrismaClient`. It actually reads your `schema.prisma` and generate models based on it.

It perfectly simulates Prisma's API and store everything in-memory for fast, isolated, and retry-able unit tests.

It's heavily tested, by comparing the mocked query results with real results from prisma. Tested environments include `MySQL`, `PostgreSQL` and `MongoDB`.

> This library can also be used as an in-memory implementation of Prisma, for reasons such as prototyping, but that's not its primary goal.

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

There are a few options here, depending on your application architecture.

## Automatically (recommended)

You can create a `__mocks__` directory at the root of your project, with a sub-directory named `@prisma`. Inside the `@prisma` directory, create a `client.js` file (or `client.ts` for TypeScript).

Inside the `client` file, you can re-export the `@prisma/client` module, and replace `PrismaClient` by `PrismockClient`:

```ts
import { PrismockClient } from 'prismock';

export * from '@prisma/client';
export { PrismockClient as PrismaClient };
```

That's it, prisma will be mocked in all your tests (tested with Jest & ViTest)

## PrismaClient

You can mock the PrismaClient directly in your test, or setupTests ([Example](https://github.com/morintd/prismock/blob/master/src/__tests__/example-prismock.test.ts)):

```ts
jest.mock('@prisma/client', () => {
  return {
    ...jest.requireActual('@prisma/client'),
    PrismaClient: jest.requireActual('prismock').PrismockClient,
  };
});
```

## Use prismock manually

You can instantiate a `PrismockClient` directly and use it in your test, or pass it to a test version of your app.

```ts
import { PrismockClient } from 'prismock';

import { PrismaService } from './prisma.service';

const prismock = new PrismockClient();
const app = createApp(prismock);
```

Then, you will be able to write your tests as if your app was using an in-memory Prisma client.

## Using custom client path

If you are using a custom [client path](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client#using-a-custom-output-path), you need the [createPrismock](https://github.com/morintd/prismock/blob/master/docs/using-custom-client-path.md) method.

## Use with decimal.js

See [use with decimal.js](https://github.com/morintd/prismock/blob/master/docs/use-with-decimal-js.md).

## Internal data

Two additional functions are returned compared to the PrismaClient, `getData`, and `reset`. In some edge-case, we need to directly access, or reset, the data store management by _prismock_.

Most of the time, you won't need it in your test, but keep in mind they exist

```ts
const prismock = new PrismockClient();
prismock.getData(); // { user: [] }
```

```ts
const prismock = new PrismockClient();
prismock.reset(); // State of prismock back to its original
```

# Supported features

## Model queries

| Feature    | State                       |
| ---------- | --------------------------- |
| findUnique | ✔                           |
| findFirst  | ✔                           |
| findMany   | ✔                           |
| create     | ✔                           |
| createMany | ✔                           |
| delete     | ✔                           |
| deleteMany | ✔                           |
| update     | ✔                           |
| updateMany | ✔                           |
| upsert     | ✔                           |
| count      | ✔                           |
| aggregate  | ✔                           |
| groupBy    | 💬 [note](#groupby-support) |

## Model query options

| Feature           | State |
| ----------------- | ----- |
| distinct          | ✔     |
| include           | ✔     |
| where             | ✔     |
| select            | ✔     |
| orderBy (Partial) | ✔     |
| select + count    | ⛔    |

## Nested queries

| Feature         | State |
| --------------- | ----- |
| create          | ✔     |
| createMany      | ✔     |
| update          | ✔     |
| updateMany      | ✔     |
| connect         | ✔     |
| connectOrCreate | ✔     |
| upsert          | ✔     |
| set             | ⛔    |
| disconnect      | ⛔    |
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
| mode      | ✔     |
| search    | ⛔    |

## Relation filters

| Feature | State |
| ------- | ----- |
| some    | ✔     |
| every   | ✔     |
| none    | ✔     |
| is      | ✔    |

## Scalar list methods

| Feature | State |
| ------- | ----- |
| set     | ⛔    |
| push    | ✔    |

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
| @@unique   | ✔     |
| @updatedAt | ⛔    |

## Attribute functions

| Feature         | State |
| --------------- | ----- |
| autoincrement() | ✔     |
| now()           | ✔     |
| uuid()          | ✔     |
| auto()          | ✔     |
| cuid()          | ✔     |
| dbgenerated     | ⛔    |

## Referential actions

| Feature                                     | State |
| ------------------------------------------- | ----- |
| onDelete (SetNull, Cascade)                 | ✔     |
| onDelete (Restrict, NoAction, SetDefault)() | ⛔    |
| onUpdate                                    | ⛔    |

## Notes

### groupBy Support

Basic groupBy queries are supported, including `having` and `orderBy`. `skip`, `take`, and `cursor` are not yet supported.

# Roadmap

- Complete supported features.
- Refactoring of update operation.
- Replace item formatting with function composition
- Restore test on `_count` for mongodb
- Add custom client method for MongoDB (`$runCommandRaw`, `findRaw`, `aggregateRaw`)

# Motivation

While _Prisma_ is amazing, its `unit testing` section is treated as optional. On the other hand, it should be a priority for developers to write tests.

As I love _Prisma_, I decided to create this package, in order to keep using it on real-world projects.

I'm also a teacher and believe it's mandatory for students to learn about testing. I needed a similar solution for my [backend course](https://www.scalablebackend.com/), so I created my own.

# Feature request

I'm personally using this library in my day-to-day activities, and add features or fix bugs depending on my needs.

If you need unsupported features or discover unwanted behaviors, feel free to open an issue, I'll take care of it.

# Credit

Inspired by [prisma-mock](https://github.com/demonsters/prisma-mock).
