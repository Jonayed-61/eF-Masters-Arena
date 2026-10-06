process.env.TS_NODE_PROJECT = require("node:path").join(process.cwd(), "tsconfig.test.json");
process.env.NODE_ENV = "test";
require("ts-node/register");
