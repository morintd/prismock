
# Using a custom client path

If you generate your prisma client to a custom path, you must use `createPrismock` instead of `PrismockClient`.

```
generator client {
  provider = "prisma-client-js"
  output = "./custom-client"
}
```

Automatic mocking using the `__mock__` directory will not work unless you generate your client in `node_modules`.

Using `jest.mock`:

```ts
import { createPrismock } from 'prismock';

jest.mock('./prisma/custom-client', () => {
  const actual = jest.requireActual('./prisma/custom-client');
  return {
    ...actual,
    PrismaClient: jest.requireActual('prismock').createPrismock(actual.Prisma),
  };
});
```

If using typescript, you may need to add the `<any>` type to the requireActual calls: `jest.requireActual<any>("./prisma/custom-client")`

Or, using direct instantiation:

```ts
import { createPrismock } from 'prismock';
import { Prisma } from './prisma/custom-client';

import { PrismaService } from './prisma.service';

const PrismockClient = createPrismock(Prisma);
const prismock = new PrismockClient();
const app = createApp(prismock);
```

### Pitfalls

If you cause `@prisma/client` to be imported by your code instead of your custom path, you may see an error when mocking Prisma:

```
TypeError: jest.requireActual(...).createPrismock is not a function
```

If you encounter this, make sure that the paths you are importing while instantiating your prismock instance are correct and that you are
always importing the custom directory instead of `@prisma/client`.
