import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [scanSummary, setScanSummary] = useState({});

  useLayoutEffect(() => {
    const generatedSummary = window.localStorage.getItem("generatedSummary") || JSON.stringify({})
    setScanSummary(JSON.parse(generatedSummary));
  }, []);

  useEffect(() => {
    if (Object.keys(scanSummary).length < 1) return
    window.localStorage.setItem("generatedSummary", JSON.stringify(scanSummary));
  }, [scanSummary])

  return (
    <AppContext.Provider value={{ scanSummary, setScanSummary }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}