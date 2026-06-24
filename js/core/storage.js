/**
 * Storage Manager
 * Handles all localStorage reads and writes using the 'cheatLabz_' namespace.
 */

const NAMESPACE = 'cheatLabz_';

export const Storage = {
  /**
   * Get a value from local storage
   * @param {string} key 
   * @param {*} defaultValue 
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(NAMESPACE + key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return defaultValue;
    }
  },

  /**
   * Set a value in local storage
   * @param {string} key 
   * @param {*} value 
   */
  set(key, value) {
    try {
      localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
  },

  /**
   * Remove a value from local storage
   * @param {string} key 
   */
  remove(key) {
    try {
      localStorage.removeItem(NAMESPACE + key);
    } catch (e) {
      console.error('Error removing from localStorage', e);
    }
  },

  /**
   * Clear all cheatLabz data from local storage
   */
  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NAMESPACE)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error('Error clearing localStorage', e);
    }
  }
};

window.Storage = Storage; // Make available globally if needed by older scripts
