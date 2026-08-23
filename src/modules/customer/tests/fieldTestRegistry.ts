import { FieldTestDefinition, FieldTestCategory } from './fieldTestTypes';
import { ALL_30_FIELD_TESTS } from './mobilityFieldTests';

export class FieldTestRegistry {
  private static instance: FieldTestRegistry;
  private tests: FieldTestDefinition[] = [];

  private constructor() {
    this.tests = [...ALL_30_FIELD_TESTS];
  }

  public static getInstance(): FieldTestRegistry {
    if (!FieldTestRegistry.instance) {
      FieldTestRegistry.instance = new FieldTestRegistry();
    }
    return FieldTestRegistry.instance;
  }

  public getAllTests(): FieldTestDefinition[] {
    return this.tests;
  }

  public getTestById(id: string): FieldTestDefinition | undefined {
    return this.tests.find((t) => t.id === id);
  }

  public getTestsByCategory(category: FieldTestCategory): FieldTestDefinition[] {
    return this.tests.filter((t) => t.category === category);
  }

  public getCategories(): FieldTestCategory[] {
    const set = new Set<FieldTestCategory>();
    this.tests.forEach((t) => set.add(t.category));
    return Array.from(set);
  }

  public getCategoryCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.tests.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }
}

export const fieldTestRegistry = FieldTestRegistry.getInstance();
