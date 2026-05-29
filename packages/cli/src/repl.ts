import * as readline from 'node:readline';
import { FileSystem } from '@ims/core';
import { runCommand } from './commands';
import { complete } from './completion';

export function startRepl(): void {
  const fs = new FileSystem();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '',
    completer: (line: string) => complete(fs, line),
  });
  const prompt = () => rl.setPrompt(`${fs.pwd()}$ `);

  console.log("In-memory filesystem. Type 'help' for commands, 'exit' to quit.");
  prompt();
  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (trimmed === 'exit') {
      rl.close();
      return;
    }
    runCommand(fs, trimmed, (s) => console.log(s));
    prompt();
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}
