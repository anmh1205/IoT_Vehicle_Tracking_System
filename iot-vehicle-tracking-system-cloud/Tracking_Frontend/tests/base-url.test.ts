import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDirectApiBase } from '../src/lib/api/base-url';

test('normalizeDirectApiBase appends canonical API prefix', () => {
  assert.equal(normalizeDirectApiBase('https://api.example.com'), 'https://api.example.com/api/v1');
  assert.equal(normalizeDirectApiBase('https://api.example.com/api'), 'https://api.example.com/api/v1');
  assert.equal(normalizeDirectApiBase('https://api.example.com/api/v1'), 'https://api.example.com/api/v1');
});

test('normalizeDirectApiBase trims quotes, spaces, and trailing slashes', () => {
  assert.equal(normalizeDirectApiBase(' "https://api.example.com/" '), 'https://api.example.com/api/v1');
  assert.equal(normalizeDirectApiBase(''), null);
});
