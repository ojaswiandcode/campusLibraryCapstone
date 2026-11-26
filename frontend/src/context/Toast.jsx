import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((text, type = 'ok') => setT({ text, type, id: Date.now() }), []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 3800);
    return () => clearTimeout(id);
  }, [t]);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && <div key={t.id} className={`toast ${t.type}`} role="status">{t.text}</div>}
    </Ctx.Provider>
  );
}