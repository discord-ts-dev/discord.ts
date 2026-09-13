import 'reflect-metadata';
import { bootstrapApp } from 'discord.ts';
import { AppModule } from './app.module';

void bootstrapApp(AppModule);
