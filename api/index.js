"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Aggregator entrypoint for Azure Functions (code-first programming model)
// Import each module so its app.http registrations run at startup.
require("./trips");
require("./trip/getBySlug");
require("./participants/create");
require("./participants/delete");
require("./expenses/create");
require("./expenses/update");
require("./expenses/delete");
// No exports needed; side-effect imports register functions.
//# sourceMappingURL=index.js.map