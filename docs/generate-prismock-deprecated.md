# Deprecation of `generatePrismock`

## What should you change starting v1.13.0

`generatePrismock` (and the less used `generatePrismockSync`) will be completely removed in a future version, I recommend anyone to start replacing them now.

You now have access to a class called `PrismockClient`. It can be used to mock the `PrismaClient` directly:

```ts
jest.mock('@prisma/client', () => {
  return {
    ...jest.requireActual('@prisma/client'),
    PrismaClient: jest.requireActual('prismock').PrismockClient,
  };
});
```

Or can be used in your codebase as-is:

```ts
import { PrismockClient } from 'prismock';

const prismock = new PrismockClient();
```

In the end:

- Mocking is easier, and doesn't rely on async functions anymore
- PrismockClient can be extended from

## Feedback

Please let me know if you have any issue with the newly introduced `PrismockClient`. While the current test suite validate its behavior, there might be some edge-cases making it hard to use.

## What's going on

Until version `1.12.0`, the mocked version of prisma client could be generated using a function `generatePrismock` (and `generatePrismockSync`).

Recently, I learned that `Prisma` always generate the content of the `DMMF` (which contains the necessary informations about models, among other things).

The goal of `generatePrismock` was to retrieve those information (through an async function).

## Changes

I wasn't completely satisfied with the current state of `generatePrismock` for two reasons:

- It doesn't need to be asynchrone (as we don't need to retrieve the `DMMF`), which also make the mock harder to write
- `PrismaClient` is supposed to be a class, which can be extended from, and wasn't supported.
