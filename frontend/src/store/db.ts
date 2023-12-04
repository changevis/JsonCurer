/* eslint-disable no-param-reassign */
function wrapPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class IndexDbForRevertHistory {
  private dbName: string;

  private storeName: string;

  private db: IDBDatabase | null;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
    this.initialize();
  }

  public initialize(): Promise<void> {
    const request = indexedDB.open(this.dbName, 1);
    request.onupgradeneeded = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      this.db.createObjectStore(this.storeName, { keyPath: 'id' });
    };

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject(new Error(`Database error: ${(event.target as IDBOpenDBRequest).error?.message}`));
      };
    });
  }

  public add(data: Record<string, any>): Promise<IDBValidKey> {
    if (!this.db) {
      return Promise.reject(new Error('Database not initialized.'));
    }

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const request = objectStore.add(data);

    return wrapPromise<IDBValidKey>(request);
  }

  public remove(id: number): Promise<void> {
    if (!this.db) {
      return Promise.reject(new Error('Database not initialized.'));
    }

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const request = objectStore.delete(id);

    return wrapPromise<undefined>(request);
  }

  public clear(): Promise<void> {
    if (!this.db) {
      return Promise.reject(new Error('Database not initialized.'));
    }

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const request = objectStore.clear();

    return wrapPromise<undefined>(request);
  }

  public get(id: number): Promise<Record<string, any>> {
    if (!this.db) {
      return Promise.reject(new Error('Database not initialized.'));
    }

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);
    const request = objectStore.get(id);

    return wrapPromise<Record<string, any>>(request);
  }
}

const db = new IndexDbForRevertHistory('cleansingHistory', 'steps');

// indexDB中存储的数据是持久化的，但是每一次加载后我们不期望保留之前的数据，所以要清空
window.onload = () => {
  db.clear();
};

export default db;
