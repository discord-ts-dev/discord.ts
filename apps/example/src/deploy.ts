import 'reflect-metadata';
import { deployWithModule } from '@discord.ts/core';
import { AppModule } from './app.module';

async function main(): Promise<void> {
  const { count } = await deployWithModule(AppModule);
  console.log(`Deployed ${count} commands.`);
  process.exit(0);
}

void main();
