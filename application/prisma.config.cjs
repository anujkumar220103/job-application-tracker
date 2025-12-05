// frontend/prisma.config.cjs
require("dotenv").config();

const { defineConfig } = require("@prisma/config");

module.exports = defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    provider: "mysql",
    url: process.env.DATABASE_URL,
  },
  generator: {
    provider: "prisma-client-js",
  },
});
