export type UnArray<T> = T extends (infer U)[] ? U : T;

export class LocalStorageMock {
  private readonly store: Record<string, string>;

  constructor() {
    this.store = {};
  }

  get length() {
    return Object.getOwnPropertyNames(this.store).length;
  }

  getItem(keyName: string) {
    return this.store[keyName] ?? null;
  }

  setItem(keyName: string, keyValue: string) {
    this.store[keyName] = keyValue;
  }

  removeItem(keyName: string) {
    delete this.store[keyName];
  }

  clear() {
    for (const property of Object.getOwnPropertyNames(this.store)) {
      delete this.store[property];
    }
  }
}
