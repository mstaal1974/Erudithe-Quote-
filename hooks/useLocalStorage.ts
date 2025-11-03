

// FIX: Add default import for 'React' to use React types like React.Dispatch.
import React, { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Set the in-memory state for React to use (this version still has the file dataUrl)
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        // Create a deep copy to avoid mutating the in-memory state that React is using.
        const storableValue = JSON.parse(JSON.stringify(valueToStore));

        // Strip large dataUrl fields from files specifically for quotes and projects before storing
        if ((key === 'quotes' || key === 'projects') && Array.isArray(storableValue)) {
          storableValue.forEach((item: any) => { 
            const processFiles = (files: any[]) => {
              if (files && Array.isArray(files)) {
                files.forEach(file => {
                  if (file && typeof file === 'object' && 'dataUrl' in file) {
                    delete file.dataUrl; // Remove the large data field
                  }
                });
              }
            };
            processFiles(item.sourceFiles);
            processFiles(item.completedFiles);
          });
        }
        
        // Save the stripped version to localStorage
        window.localStorage.setItem(key, JSON.stringify(storableValue));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
        } catch (error) {
          console.error(error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [storedValue, setValue];
}

export default useLocalStorage;