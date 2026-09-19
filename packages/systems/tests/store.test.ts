import { MemoryStore } from '../src/index.js';
import { storeConformance } from '../../../tests/store-conformance.js';

storeConformance('MemoryStore', () => new MemoryStore());
