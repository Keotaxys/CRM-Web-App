import assert from 'node:assert/strict';

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function createDatabase(documents, writes) {
  let nextId = 1;

  const documentRef = (path) => ({
    id: path.split('/').at(-1),
    path,
    kind: 'document',
    collection(name) {
      return collectionRef(`${path}/${name}`);
    },
  });

  const queryRef = (path, filters = [], maximum = null) => ({
    path,
    kind: 'query',
    filters,
    maximum,
    where(field, operator, value) {
      assert.equal(operator, '==');
      return queryRef(path, [...filters, { field, value }], maximum);
    },
    limit(value) {
      return queryRef(path, filters, value);
    },
  });

  const collectionRef = (path) => ({
    id: path.split('/').at(-1),
    path,
    kind: 'collection',
    doc(id) {
      return documentRef(`${path}/${id ?? `auto-${nextId++}`}`);
    },
    where(field, operator, value) {
      return queryRef(path).where(field, operator, value);
    },
    limit(value) {
      return queryRef(path).limit(value);
    },
  });

  const snapshot = (ref, value) => ({
    id: ref.id,
    ref,
    exists: value !== undefined,
    data: () => clone(value),
  });

  const querySnapshot = (target) => {
    const prefix = `${target.path}/`;
    let docs = [...documents.entries()]
      .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .filter(([, value]) => target.filters.every(({ field, value: expected }) => value?.[field] === expected))
      .map(([path, value]) => snapshot(documentRef(path), value));
    if (target.maximum !== null) docs = docs.slice(0, target.maximum);
    return { empty: docs.length === 0, size: docs.length, docs };
  };

  return {
    doc: documentRef,
    collection: collectionRef,
    async runTransaction(callback) {
      const staged = [];
      const transaction = {
        async get(target) {
          if (target.kind === 'query' || target.kind === 'collection') {
            return querySnapshot(target.kind === 'collection' ? queryRef(target.path) : target);
          }
          return snapshot(target, documents.get(target.path));
        },
        create(ref, value) {
          if (documents.has(ref.path)
            || staged.some((write) => write.path === ref.path && write.type !== 'delete')) {
            throw new Error(`Document already exists: ${ref.path}`);
          }
          staged.push({ type: 'create', path: ref.path, value: clone(value) });
        },
        set(ref, value, options) {
          staged.push({ type: 'set', path: ref.path, value: clone(value), options: clone(options) });
        },
        update(ref, value) {
          staged.push({ type: 'update', path: ref.path, value: clone(value) });
        },
        delete(ref) {
          staged.push({ type: 'delete', path: ref.path });
        },
      };

      const result = await callback(transaction);
      const committed = new Map([...documents.entries()]
        .map(([path, value]) => [path, clone(value)]));
      for (const write of staged) {
        if (write.type === 'create') {
          if (committed.has(write.path)) throw new Error(`Document already exists: ${write.path}`);
          committed.set(write.path, clone(write.value));
        } else if (write.type === 'update') {
          if (!committed.has(write.path)) throw new Error(`Document does not exist: ${write.path}`);
          committed.set(write.path, { ...committed.get(write.path), ...clone(write.value) });
        } else if (write.type === 'set') {
          committed.set(write.path, write.options?.merge
            ? { ...(committed.get(write.path) ?? {}), ...clone(write.value) }
            : clone(write.value));
        } else {
          committed.delete(write.path);
        }
      }
      documents.clear();
      for (const [path, value] of committed) documents.set(path, clone(value));
      writes.push(...staged.map((write) => clone(write)));
      return result;
    },
  };
}

export function fakeGiftFirestore(initialDocuments = {}) {
  const documents = new Map(Object.entries(initialDocuments)
    .map(([path, value]) => [path, clone(value)]));
  const writes = [];
  return { services: { db: createDatabase(documents, writes) }, documents, writes };
}
