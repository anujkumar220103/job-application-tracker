// frontend/prisma.config.cjs
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const { defineConfig } = require("@prisma/config");

module.exports = defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    provider: "postgresql",
    url: process.env.DATABASE_URL,
  },
  generator: {
    provider: "prisma-client-js",
  },
});
