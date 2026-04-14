import { QuadStore } from '@triplestore/core';

const store = new QuadStore();
console.log('Methods on QuadStore prototype:');
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(store)));
console.log('delete arity:', store.delete.length);
console.log('add arity:', store.add.length);
