import Dexie, { type Table } from 'dexie';

export interface Meal {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  name: string;
  photo?: string; // base64 representation of image
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  servingSize: string;
  servingQuantity: number;
}

export interface WaterLog {
  id?: number;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  amount: number; // in ml
}

export interface Setting {
  key: string;
  value: any;
}

export class NutriTrackDB extends Dexie {
  meals!: Table<Meal>;
  water!: Table<WaterLog>;
  settings!: Table<Setting>;

  constructor() {
    super('NutriTrackDatabase');
    this.version(1).stores({
      meals: '++id, date, timestamp',
      water: '++id, date, timestamp',
      settings: 'key'
    });
  }
}

export const db = new NutriTrackDB();

// Helper functions for settings
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const record = await db.settings.get(key);
    return record ? (record.value as T) : defaultValue;
  } catch (e) {
    console.error('Error fetching setting:', key, e);
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    await db.settings.put({ key, value });
  } catch (e) {
    console.error('Error writing setting:', key, e);
  }
}
