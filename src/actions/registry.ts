import { ActionType } from '../protocol/types';
import { ActionDefinition } from './types';

const registry = new Map<ActionType, ActionDefinition>();

export function registerAction(def: ActionDefinition): void {
  registry.set(def.type, def);
}

export function getAction(type: ActionType): ActionDefinition | undefined {
  return registry.get(type);
}

export function allActions(): ActionDefinition[] {
  return Array.from(registry.values());
}

export function actionsByCategory(): Record<string, ActionDefinition[]> {
  const grouped: Record<string, ActionDefinition[]> = {};
  for (const def of allActions()) {
    (grouped[def.category] ??= []).push(def);
  }
  return grouped;
}
