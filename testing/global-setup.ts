import fs from 'fs/promises';
import { resolve } from 'path';

import { Config } from '@jest/types';

module.exports = async function (_globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) {
  await copyPrismaClient(projectConfig.rootDir);
};

export async function copyPrismaClient(rootDir: string) {
  const clientSrc = resolve(rootDir, 'node_modules', '.prisma', 'client');
  const clientDest = resolve(rootDir, 'node_modules', '.prisma-custom', 'client');
  await fs.cp(clientSrc, clientDest, { force: true, recursive: true });
}
