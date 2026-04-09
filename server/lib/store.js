import fs from "node:fs/promises";
import path from "node:path";

function defaultDb() {
  return {
    nextIds: { menuItem: 1, order: 1 },
    menuItems: [],
    orders: []
  };
}

async function writeJsonAtomic(filePath, jsonString) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, jsonString, "utf8");
  await fs.rename(tmp, filePath);
}

async function loadDb(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return defaultDb();
    return {
      ...defaultDb(),
      ...parsed,
      nextIds: { ...defaultDb().nextIds, ...(parsed.nextIds || {}) }
    };
  } catch (err) {
    if (err?.code === "ENOENT") return defaultDb();
    throw err;
  }
}

export function createStore({ dbPath }) {
  let db = defaultDb();
  let ready = (async () => {
    db = await loadDb(dbPath);
    await writeJsonAtomic(dbPath, JSON.stringify(db, null, 2));
  })();

  let writeQueue = Promise.resolve();

  function read() {
    return db;
  }

  async function update(fn) {
    await ready;

    let result;
    writeQueue = writeQueue
      .catch(() => {})
      .then(async () => {
        result = await fn(db);
        await writeJsonAtomic(dbPath, JSON.stringify(db, null, 2));
      });

    await writeQueue;
    return result;
  }

  return { read, update, ready };
}

