/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  },
  
  // Configuration de couverture conforme au Cahier des Charges v2.1
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types/**/*.ts',
    '!src/**/*.interface.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'text-summary'],
  
  // Seuils de couverture selon le cahier des charges (90%+ requis)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Seuils spécifiques pour les nouvelles fonctionnalités v2.1
    'src/detectors/ContentDetector.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/parsers/AudioParser.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/utils/FileUploadHandler.ts': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Configuration de performance
  testTimeout: 30000,
  verbose: true,
  maxWorkers: '50%',
  
  // Optimisations pour les tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/dist-esm/',
    '/coverage/'
  ],
  
  // Mapping des modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Configuration pour les tests de performance
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  },
  
  // Reporters personnalisés
  reporters: ['default'],
  
  // Configuration pour les tests parallèles
  maxConcurrency: 5,
  
  // Gestion des erreurs
  errorOnDeprecated: true,
  
  // Cache pour améliorer les performances
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
};