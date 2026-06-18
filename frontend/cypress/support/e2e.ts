// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Comprehensive Node.js polyfills for browser environment
declare global {
  var process: {
    env: Record<string, string | undefined>;
    version?: string;
    versions?: Record<string, string>;
    platform?: string;
    arch?: string;
  };
  var require: (id: string) => any;
  var module: { exports: any };
  var __dirname: string;
  var __filename: string;
}

const g = globalThis as any;

// Setup process
if (typeof g.process === 'undefined') {
  g.process = {
    env: {
      NODE_ENV: 'test',
      REACT_APP_API_URL: 'http://localhost:3000'
    },
    version: '18.0.0',
    versions: { node: '18.0.0' },
    platform: 'win32',
    arch: 'x64'
  };
}

// Setup os module
if (typeof g.os === 'undefined') {
  g.os = {
    constants: {
      signals: {
        SIGHUP: 1,
        SIGINT: 2,
        SIGQUIT: 3,
        SIGILL: 4,
        SIGTRAP: 5,
        SIGABRT: 6,
        SIGBUS: 7,
        SIGFPE: 8,
        SIGKILL: 9,
        SIGUSR1: 10,
        SIGSEGV: 11,
        SIGUSR2: 12,
        SIGPIPE: 13,
        SIGALRM: 14,
        SIGTERM: 15,
        SIGCHLD: 17,
        SIGCONT: 18,
        SIGSTOP: 19,
        SIGTSTP: 20,
        SIGTTIN: 21,
        SIGTTOU: 22
      }
    }
  };
}

// Setup require function
if (typeof g.require === 'undefined') {
  g.require = (id: string) => {
    if (id === 'os') return g.os;
    if (id === 'path') return { join: () => '', resolve: () => '' };
    if (id === 'fs') return {};
    return {};
  };
}

// Setup module
if (typeof g.module === 'undefined') {
  g.module = { exports: {} };
}

// Setup __dirname and __filename
if (typeof g.__dirname === 'undefined') {
  g.__dirname = '/';
}
if (typeof g.__filename === 'undefined') {
  g.__filename = '/index.js';
}

// Import commands.js using ES2015 syntax:
import './commands'