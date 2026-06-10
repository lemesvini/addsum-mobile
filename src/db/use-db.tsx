import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createDatabase, type AppDatabase } from "./index";
import { destroyDatabase as destroySqlite } from "./sqlite-persistence";

type DatabaseContextValue = {
  db: AppDatabase | null;
  isReady: boolean;
  resetDatabase: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

let resetDatabaseRef: (() => Promise<void>) | null = null;

export function getResetDatabase() {
  return resetDatabaseRef;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const dbRef = useRef<AppDatabase | null>(null);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const initDb = useCallback(async () => {
    try {
      const database = await createDatabase();
      dbRef.current = database;
      setDb(database);
      setIsReady(true);
    } catch (e) {
      console.error("[db] init failed", e);
    }
  }, []);

  const resetDatabase = useCallback(async () => {
    const current = dbRef.current;
    if (current) {
      try {
        await current.remove();
      } catch (e) {
        console.warn("[db] remove failed", e);
      }
      dbRef.current = null;
    }
    await destroySqlite();
    setDb(null);
    setIsReady(false);

    try {
      const database = await createDatabase();
      dbRef.current = database;
      setDb(database);
      setIsReady(true);
    } catch (e) {
      console.error("[db] re-init failed", e);
    }
  }, []);

  useEffect(() => {
    resetDatabaseRef = resetDatabase;
    return () => {
      resetDatabaseRef = null;
    };
  }, [resetDatabase]);

  useEffect(() => {
    initDb();
    return () => {
      const current = dbRef.current;
      if (current) {
        void current.remove();
      }
      dbRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // React 19: use Context directly as a provider component
    <DatabaseContext value={{ db, isReady, resetDatabase }}>
      {children}
    </DatabaseContext>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error("useDatabase must be used within DatabaseProvider");
  return ctx;
}
