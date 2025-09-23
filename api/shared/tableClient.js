"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionString = getConnectionString;
exports.getTableClient = getTableClient;
exports.newId = newId;
exports.nowIso = nowIso;
exports.ensureTableExists = ensureTableExists;
exports.getTripIdBySlug = getTripIdBySlug;
exports.listTripRows = listTripRows;
exports.requireWriteAuth = requireWriteAuth;
const data_tables_1 = require("@azure/data-tables");
const crypto_1 = require("crypto");
const tableName = process.env.TABLE_NAME || 'TripsData';
function getConnectionString() {
    const cs = process.env.TABLES_CONNECTION_STRING ||
        process.env.STORAGE_CONNECTION || // added to support Static Web Apps custom setting
        process.env.AzureWebJobsStorage;
    if (!cs)
        throw new Error('Missing TABLES_CONNECTION_STRING/STORAGE_CONNECTION/AzureWebJobsStorage');
    return cs;
}
function getTableClient() {
    const connectionString = getConnectionString();
    // allowInsecureConnection is mainly helpful when using Azurite locally
    return data_tables_1.TableClient.fromConnectionString(connectionString, tableName, { allowInsecureConnection: true });
}
function newId() { return (0, crypto_1.randomUUID)(); }
function nowIso() { return new Date().toISOString(); }
async function ensureTableExists(client) {
    try {
        await client.createTable();
    }
    catch (e) {
        if (e.statusCode !== 409)
            throw e;
    }
}
async function getTripIdBySlug(client, slug) {
    try {
        const entity = await client.getEntity('slug', slug);
        return entity.tripId || null;
    }
    catch (e) {
        if (e.statusCode === 404)
            return null;
        throw e;
    }
}
async function listTripRows(client, tripId) {
    const rows = [];
    for await (const entity of client.listEntities({ queryOptions: { filter: (0, data_tables_1.odata) `PartitionKey eq ${tripId}` } })) {
        rows.push(entity);
    }
    return rows;
}
// Public mode: auth disabled – keep function for compatibility (no-op)
function requireWriteAuth(_secretTokenFromRow, _provided) { }
//# sourceMappingURL=tableClient.js.map