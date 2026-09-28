'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { newId } from '@/lib/game/ids';
import { HK_STANDARD, OUR_TABLE, type Rules } from './types';

/**
 * A named set of house rules the group can reuse.
 *
 * A game stores a snapshot of its rules, never a reference to one of these, so
 * editing a rule set later cannot rewrite the scores of a game already played.
 */
export interface RuleSet {
  id: string;
  name: string;
  rules: Rules;
  /** Built in sets ship with the app and cannot be edited or deleted. */
  builtIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const BUILT_IN_RULE_SETS: RuleSet[] = [
  {
    id: 'builtin:our_table',
    name: 'Our table',
    rules: OUR_TABLE,
    builtIn: true,
  },
  {
    id: 'builtin:hk_standard',
    name: 'Hong Kong standard',
    rules: HK_STANDARD,
    builtIn: true,
  },
];

interface RuleSetDB extends DBSchema {
  ruleSets: { key: string; value: RuleSet };
}

const DB_NAME = 'mahjong-rule-sets';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RuleSetDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<RuleSetDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('ruleSets', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

/** Built in sets first, then the group's own, newest last. */
export async function listRuleSets(): Promise<RuleSet[]> {
  const saved = await (await db()).getAll('ruleSets');
  saved.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  return [...BUILT_IN_RULE_SETS, ...saved];
}

export async function saveRuleSet(name: string, rules: Rules): Promise<RuleSet> {
  const now = new Date().toISOString();
  const set: RuleSet = {
    id: newId(),
    name: name.trim() || 'Untitled rules',
    rules,
    createdAt: now,
    updatedAt: now,
  };
  await (await db()).put('ruleSets', set);
  return set;
}

export async function updateRuleSet(
  id: string,
  patch: Partial<Pick<RuleSet, 'name' | 'rules'>>,
): Promise<void> {
  const database = await db();
  const existing = await database.get('ruleSets', id);
  if (!existing || existing.builtIn) return;
  await database.put('ruleSets', {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRuleSet(id: string): Promise<void> {
  if (id.startsWith('builtin:')) return;
  await (await db()).delete('ruleSets', id);
}
