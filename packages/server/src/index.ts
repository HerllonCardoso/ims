import { buildApp, defaultStaticDir } from './app';

async function main(): Promise<void> {
  const { app } = await buildApp({ logger: true, staticDir: defaultStaticDir });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
