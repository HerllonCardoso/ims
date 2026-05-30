import { buildApp, type BuiltApp } from '../src/app';

export function build(): Promise<BuiltApp> {
  return buildApp({ logger: false });
}
