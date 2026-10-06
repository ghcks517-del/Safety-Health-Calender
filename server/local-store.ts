import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const SESSION_SECRET = process.env.SESSION_SECRET || 'safety_health_calendar_secure_session_secret_2026';

interface StorageSchema {
  collections: Record<string, Record<string, any>>;
  users: Record<string, { uid: string; claims: any; revokedAt?: number }>;
}

let memoryData: StorageSchema = {
  collections: {},
  users: {}
};

function ensureInitialized() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryData = JSON.parse(raw);
      if (!memoryData.collections) memoryData.collections = {};
      if (!memoryData.users) memoryData.users = {};
    } catch (e) {
      console.error('Error reading db.json, creating clean store:', e);
      persistSync();
    }
  } else {
    persistSync();
  }
}

function persistSync() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(memoryData, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

ensureInitialized();

export function generateAutoId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < 20; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return autoId;
}

export class LocalDocumentSnapshot {
  id: string;
  exists: boolean;
  private _data: any;

  constructor(id: string, data: any) {
    this.id = id;
    this.exists = data !== undefined && data !== null;
    this._data = data ? structuredClone(data) : undefined;
  }

  data(): any {
    return this.exists ? structuredClone(this._data) : undefined;
  }
}

export class LocalQuerySnapshot {
  docs: LocalDocumentSnapshot[];
  empty: boolean;
  size: number;

  constructor(docs: LocalDocumentSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }

  forEach(callback: (doc: LocalDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

export class LocalQuery {
  protected collectionName: string;
  protected filters: Array<{ field: string; op: string; value: any }> = [];

  constructor(collectionName: string, filters: Array<{ field: string; op: string; value: any }> = []) {
    this.collectionName = collectionName;
    this.filters = filters;
  }

  where(field: string, op: string, value: any): LocalQuery {
    return new LocalQuery(this.collectionName, [...this.filters, { field, op, value }]);
  }

  async get(): Promise<LocalQuerySnapshot> {
    ensureInitialized();
    const col = memoryData.collections[this.collectionName] || {};
    const docs: LocalDocumentSnapshot[] = [];

    for (const [id, data] of Object.entries(col)) {
      let match = true;
      for (const filter of this.filters) {
        const itemVal = data[filter.field];
        if (filter.op === '==') {
          if (itemVal !== filter.value) { match = false; break; }
        } else if (filter.op === '!=') {
          if (itemVal === filter.value) { match = false; break; }
        } else if (filter.op === '>') {
          if (itemVal <= filter.value) { match = false; break; }
        } else if (filter.op === '>=') {
          if (itemVal < filter.value) { match = false; break; }
        } else if (filter.op === '<') {
          if (itemVal >= filter.value) { match = false; break; }
        } else if (filter.op === '<=') {
          if (itemVal > filter.value) { match = false; break; }
        } else if (filter.op === 'in') {
          if (!Array.isArray(filter.value) || !filter.value.includes(itemVal)) { match = false; break; }
        } else if (filter.op === 'array-contains') {
          if (!Array.isArray(itemVal) || !itemVal.includes(filter.value)) { match = false; break; }
        }
      }
      if (match) {
        docs.push(new LocalDocumentSnapshot(id, data));
      }
    }

    return new LocalQuerySnapshot(docs);
  }
}

export class LocalDocumentReference {
  id: string;
  collectionName: string;

  constructor(collectionName: string, id: string) {
    this.collectionName = collectionName;
    this.id = id;
  }

  async get(): Promise<LocalDocumentSnapshot> {
    ensureInitialized();
    const col = memoryData.collections[this.collectionName] || {};
    const data = col[this.id];
    return new LocalDocumentSnapshot(this.id, data);
  }

  async set(data: any, options?: { merge?: boolean }): Promise<void> {
    ensureInitialized();
    if (!memoryData.collections[this.collectionName]) {
      memoryData.collections[this.collectionName] = {};
    }
    const cleanData = JSON.parse(JSON.stringify(data));
    if (options?.merge && memoryData.collections[this.collectionName][this.id]) {
      memoryData.collections[this.collectionName][this.id] = {
        ...memoryData.collections[this.collectionName][this.id],
        ...cleanData
      };
    } else {
      memoryData.collections[this.collectionName][this.id] = cleanData;
    }
    persistSync();
  }

  async update(data: any): Promise<void> {
    ensureInitialized();
    const col = memoryData.collections[this.collectionName];
    if (!col || !col[this.id]) {
      throw new Error(`Document ${this.collectionName}/${this.id} not found for update`);
    }
    const cleanData = JSON.parse(JSON.stringify(data));
    col[this.id] = {
      ...col[this.id],
      ...cleanData
    };
    persistSync();
  }

  async delete(): Promise<void> {
    ensureInitialized();
    const col = memoryData.collections[this.collectionName];
    if (col && col[this.id]) {
      delete col[this.id];
      persistSync();
    }
  }
}

export class LocalCollectionReference extends LocalQuery {
  id: string;

  constructor(collectionName: string) {
    super(collectionName);
    this.id = collectionName;
  }

  doc(docId?: string): LocalDocumentReference {
    const id = docId || generateAutoId();
    return new LocalDocumentReference(this.collectionName, id);
  }
}

export class LocalBatch {
  private operations: Array<() => void> = [];

  set(docRef: LocalDocumentReference, data: any, options?: { merge?: boolean }): LocalBatch {
    this.operations.push(() => {
      if (!memoryData.collections[docRef.collectionName]) {
        memoryData.collections[docRef.collectionName] = {};
      }
      const cleanData = JSON.parse(JSON.stringify(data));
      if (options?.merge && memoryData.collections[docRef.collectionName][docRef.id]) {
        memoryData.collections[docRef.collectionName][docRef.id] = {
          ...memoryData.collections[docRef.collectionName][docRef.id],
          ...cleanData
        };
      } else {
        memoryData.collections[docRef.collectionName][docRef.id] = cleanData;
      }
    });
    return this;
  }

  update(docRef: LocalDocumentReference, data: any): LocalBatch {
    this.operations.push(() => {
      const col = memoryData.collections[docRef.collectionName];
      if (col && col[docRef.id]) {
        const cleanData = JSON.parse(JSON.stringify(data));
        col[docRef.id] = {
          ...col[docRef.id],
          ...cleanData
        };
      }
    });
    return this;
  }

  delete(docRef: LocalDocumentReference): LocalBatch {
    this.operations.push(() => {
      const col = memoryData.collections[docRef.collectionName];
      if (col && col[docRef.id]) {
        delete col[docRef.id];
      }
    });
    return this;
  }

  async commit(): Promise<void> {
    ensureInitialized();
    for (const op of this.operations) {
      op();
    }
    persistSync();
  }
}

export class LocalTransaction {
  async get(docRef: LocalDocumentReference): Promise<LocalDocumentSnapshot> {
    return docRef.get();
  }

  set(docRef: LocalDocumentReference, data: any, options?: { merge?: boolean }): LocalTransaction {
    if (!memoryData.collections[docRef.collectionName]) {
      memoryData.collections[docRef.collectionName] = {};
    }
    const cleanData = JSON.parse(JSON.stringify(data));
    if (options?.merge && memoryData.collections[docRef.collectionName][docRef.id]) {
      memoryData.collections[docRef.collectionName][docRef.id] = {
        ...memoryData.collections[docRef.collectionName][docRef.id],
        ...cleanData
      };
    } else {
      memoryData.collections[docRef.collectionName][docRef.id] = cleanData;
    }
    return this;
  }

  update(docRef: LocalDocumentReference, data: any): LocalTransaction {
    const col = memoryData.collections[docRef.collectionName];
    if (col && col[docRef.id]) {
      const cleanData = JSON.parse(JSON.stringify(data));
      col[docRef.id] = {
        ...col[docRef.id],
        ...cleanData
      };
    }
    return this;
  }

  delete(docRef: LocalDocumentReference): LocalTransaction {
    const col = memoryData.collections[docRef.collectionName];
    if (col && col[docRef.id]) {
      delete col[docRef.id];
    }
    return this;
  }
}

export class LocalFirestore {
  collection(name: string): LocalCollectionReference {
    return new LocalCollectionReference(name);
  }

  batch(): LocalBatch {
    return new LocalBatch();
  }

  async runTransaction<T>(updateFunction: (transaction: LocalTransaction) => Promise<T>): Promise<T> {
    ensureInitialized();
    const t = new LocalTransaction();
    const result = await updateFunction(t);
    persistSync();
    return result;
  }
}

export class LocalAuth {
  async createUser(properties: { disabled?: boolean }): Promise<{ uid: string }> {
    ensureInitialized();
    const uid = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    memoryData.users[uid] = {
      uid,
      claims: {
        disabled: !!properties.disabled
      }
    };
    persistSync();
    return { uid };
  }

  async setCustomUserClaims(uid: string, customUserClaims: any): Promise<void> {
    ensureInitialized();
    if (!memoryData.users[uid]) {
      memoryData.users[uid] = { uid, claims: {} };
    }
    memoryData.users[uid].claims = {
      ...memoryData.users[uid].claims,
      ...customUserClaims
    };
    persistSync();
  }

  async createCustomToken(uid: string, customClaims?: any): Promise<string> {
    const payload = {
      uid,
      ...customClaims,
      iat: Math.floor(Date.now() / 1000)
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  async createSessionCookie(tokenOrData: string, options: { expiresIn: number }): Promise<string> {
    let payloadData: any = {};
    try {
      if (tokenOrData.startsWith('{')) {
        payloadData = JSON.parse(tokenOrData);
      } else if (tokenOrData.includes('.')) {
        const parts = tokenOrData.split('.');
        payloadData = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      } else {
        payloadData = { uid: tokenOrData };
      }
    } catch {
      payloadData = { uid: tokenOrData };
    }

    const payload = {
      ...payloadData,
      exp: Date.now() + options.expiresIn,
      iat: Date.now()
    };

    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    return `${body}.${signature}`;
  }

  async verifySessionCookie(sessionCookie: string, checkRevoked = false): Promise<any> {
    if (!sessionCookie || !sessionCookie.includes('.')) {
      throw new Error('Invalid session cookie format');
    }

    const [body, signature] = sessionCookie.split('.');
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    if (signature !== expectedSig) {
      throw new Error('Invalid session signature');
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      throw new Error('Session cookie has expired');
    }

    if (checkRevoked && payload.uid) {
      ensureInitialized();
      const user = memoryData.users[payload.uid];
      if (user?.revokedAt && payload.iat && payload.iat < user.revokedAt) {
        throw new Error('Session has been revoked');
      }
    }

    return payload;
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    ensureInitialized();
    if (memoryData.users[uid]) {
      memoryData.users[uid].revokedAt = Date.now();
      persistSync();
    }
  }
}
