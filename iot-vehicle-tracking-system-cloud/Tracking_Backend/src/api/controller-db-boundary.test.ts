import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const controllersDir = join(__dirname, 'controllers');

const listTypeScript = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScript(absolute);
    return entry.name.endsWith('.ts') ? [absolute] : [];
  });

describe('API transport to database architectural boundary', () => {
  it('does not allow controllers to import infrastructure database or issue SQL', () => {
    const violations: string[] = [];
    for (const file of listTypeScript(controllersDir)) {
      const source = readFileSync(file, 'utf8');
      // SQL and concrete Postgres connections belong to repositories/use cases.
      // Controllers should only parse input, enforce route auth and call services.
      if (/from\s*['"][^'"]*infrastructure\/database(?:\/[^'"]*)?['"]/.test(source) ||
          /\b(?:pool|client)\.query\s*\(/.test(source)) {
        violations.push(file.slice(controllersDir.length + 1));
      }
    }
    expect(violations, 'Move DB access behind a repository/service').toEqual([]);
  });

  it('routes statistics requests through the policy-aware application service', () => {
    const file = readFileSync(join(controllersDir, 'statistics.controller.ts'), 'utf8');
    expect(file).toContain("from '@/domain/statistics/services/statistics.service'");
    expect(file).not.toMatch(/\b(?:pool|client)\.query\s*\(/);
  });
});
