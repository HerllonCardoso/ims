import { buildApp, type BuiltApp } from '../src/app';

export function build(): BuiltApp {
  return buildApp({ logger: false });
}
