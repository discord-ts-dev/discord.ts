import 'reflect-metadata';
import { deployWithModule } from '@discord.ts/core';
import { AppModule } from './app.module.js';

async function main(): Promise<void> {
  const { count } = await deployWithModule(AppModule);
  process.stdout.write(`Deployed ${count} commands.\n`);
  process.exit(0);
}

void main();
