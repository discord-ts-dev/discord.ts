import 'reflect-metadata';
import { bootstrapApp } from '@discord-ts/core';
import { AppModule } from './app.module';

void bootstrapApp(AppModule);
