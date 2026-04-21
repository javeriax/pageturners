import '@testing-library/jest-dom';

/**
 * Mock localStorage for test environment
 * This fixes: "Cannot initialize local storage without a `--localstorage-file` path"
 */
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

global.localStorage = localStorageMock;
