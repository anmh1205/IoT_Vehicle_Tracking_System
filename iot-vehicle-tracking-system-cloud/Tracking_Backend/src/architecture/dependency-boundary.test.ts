import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const backendSrc = resolve(process.cwd(), 'src');

const typeScriptFiles = (root: string): string[] =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? typeScriptFiles(join(root, entry.name))
      : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
        ? [join(root, entry.name)]
        : [],
  );

const forbiddenDatabaseImports = [
  '@/infrastructure/database/pool',
  '@/infrastructure/database/queries',
  '@/infrastructure/database/connection',
];

describe('backend dependency direction', () => {
  it('keeps concrete persistence concerns out of HTTP controllers', () => {
    const controllers = typeScriptFiles(join(backendSrc, 'api', 'controllers'));
    expect(controllers.length).toBeGreaterThan(10);

    const offenders = controllers.flatMap((file) => {
      const content = readFileSync(file, 'utf8');
      const found = forbiddenDatabaseImports.filter((specifier) =>
        content.includes(`from '${specifier}'`) ||
        content.includes(`from "${specifier}"`),
      );
      return found.map((specifier) => `${file}: ${specifier}`);
    });

    expect(offenders, 'SQL access belongs in a repository/adapter, never HTTP controllers').toEqual([]);
  });

  it('keeps the statistics application service independent of concrete SQL clients', () => {
    const statisticsService = readFileSync(
      join(backendSrc, 'domain/statistics/services/statistics.service.ts'), 'utf8',
    );
    for (const specifier of forbiddenDatabaseImports) {
      expect(statisticsService).not.toContain(`from '${specifier}'`);
      expect(statisticsService).not.toContain(`from "${specifier}"`);
    }
  });
});
