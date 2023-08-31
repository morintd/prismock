/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient } from '@prisma/client';

import { simulateSeed } from '../testing';

const prisma = new PrismaClient();

async function main() {
  await simulateSeed(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
