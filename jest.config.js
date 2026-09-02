const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],

  collectCoverageFrom: [
    "src/app/student/tickets/create/page.tsx",
    "src/app/student/tickets/[id]/page.tsx",
    "src/app/agent/tickets/[id]/page.tsx",
  ],
};

module.exports = createJestConfig(customJestConfig);
