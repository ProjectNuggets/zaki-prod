/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^react-markdown$": "<rootDir>/src/test/reactMarkdownMock.tsx",
    "^remark-gfm$": "<rootDir>/src/test/remarkMock.ts",
    "^rehype-highlight$": "<rootDir>/src/test/rehypeMock.ts",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/test/styleMock.ts"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
