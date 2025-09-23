"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tableClient_1 = require("./shared/tableClient");
const XLSX = __importStar(require("xlsx"));
const MAX_ROWS = 500;
functions_1.app.http('importSpreadsheet', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'trips/{slug}/importSpreadsheet',
    handler: async (req, ctx) => {
        const slug = req.params?.slug;
        if (!slug)
            return { status: 400, jsonBody: { error: 'slug required' } };
        let body;
        try {
            body = await req.json();
        }
        catch {
            return { status: 400, jsonBody: { error: 'invalid json' } };
        }
        if (!body.paidBy)
            return { status: 400, jsonBody: { error: 'paidBy required' } };
        if (!body.fileName || !body.fileContentBase64)
            return { status: 400, jsonBody: { error: 'fileName and fileContentBase64 required' } };
        try {
            const client = (0, tableClient_1.getTableClient)();
            const tripId = await (0, tableClient_1.getTripIdBySlug)(client, slug);
            if (!tripId)
                return { status: 404, jsonBody: { error: 'trip not found' } };
            // Validate paidBy is an existing participant
            const rows = await (0, tableClient_1.listTripRows)(client, tripId);
            const participantIds = new Set(rows.filter(r => r.type === 'participant').map(r => r.participantId));
            if (!participantIds.has(body.paidBy))
                return { status: 400, jsonBody: { error: 'paidBy participant not found' } };
            const buffer = Buffer.from(body.fileContentBase64, 'base64');
            const lower = body.fileName.toLowerCase();
            let parsedRows = [];
            if (lower.endsWith('.csv')) {
                parsedRows = parseCsv(buffer.toString('utf8'));
            }
            else if (lower.endsWith('.xlsx')) {
                parsedRows = parseXlsx(buffer);
            }
            else {
                return { status: 400, jsonBody: { error: 'unsupported file type (must be .csv or .xlsx)' } };
            }
            if (parsedRows.length > MAX_ROWS) {
                parsedRows = parsedRows.slice(0, MAX_ROWS);
                parsedRows[parsedRows.length - 1].warnings.push('truncated-rows');
            }
            // Basic validity stats
            let valid = 0;
            for (const r of parsedRows)
                if (r.amount !== null && r.amount > 0 && r.description.trim())
                    valid++;
            return { status: 200, jsonBody: {
                    rows: parsedRows,
                    summary: {
                        totalRows: parsedRows.length,
                        validRows: valid,
                        invalidRows: parsedRows.length - valid
                    }
                } };
        }
        catch (e) {
            ctx.error(e);
            return { status: 500, jsonBody: { error: e.message || 'internal error' } };
        }
    }
});
function normalizeHeader(h) {
    return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0)
        return [];
    const headerLine = lines[0];
    const headers = headerLine.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(h => h.replace(/^"|"$/g, ''));
    const norm = headers.map(normalizeHeader);
    const map = detectColumns(norm);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const raw = lines[i];
        const cols = raw.split(/,(?!(?:[^"]*"[^"]*")*[^"]*$)/); // simple fallback; may split inside quotes edge cases
        const warnings = [];
        const amountStr = pick(cols, map.amount);
        const amount = parseAmount(amountStr, warnings);
        const dateStr = pick(cols, map.date);
        const date = parseDate(dateStr, warnings);
        const desc = resolveDescription(cols, map, warnings);
        const currency = map.currency != null ? sanitizeCurrency(pick(cols, map.currency), warnings) : undefined;
        rows.push({ index: i - 1, include: true, amount, date, description: desc, currency, warnings });
    }
    return rows;
}
function parseXlsx(buf) {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (json.length === 0)
        return [];
    const headers = Object.keys(json[0]);
    const norm = headers.map(normalizeHeader);
    const map = detectColumns(norm);
    const rows = [];
    json.forEach((row, idx) => {
        const warnings = [];
        const amount = parseAmount(row[headers[map.amount ?? -1]], warnings);
        const date = parseDate(row[headers[map.date ?? -1]], warnings);
        const currency = map.currency != null ? sanitizeCurrency(row[headers[map.currency]], warnings) : undefined;
        const desc = resolveDescriptionObject(row, headers, map, warnings);
        rows.push({ index: idx, include: true, amount, date, description: desc, currency, warnings });
    });
    return rows;
}
function detectColumns(norm) {
    const map = {};
    norm.forEach((h, i) => {
        if (map.amount == null && /^(amount|amt|total|value)$/.test(h))
            map.amount = i;
        else if (map.date == null && /^(date|transactiondate|dt)$/.test(h))
            map.date = i;
        else if (map.description == null && /^(description|desc|note|notes|memo)$/.test(h))
            map.description = i;
        else if (map.merchant == null && /^(merchant|vendor|store|place|shop)$/.test(h))
            map.merchant = i;
        else if (map.currency == null && /^(currency|curr|ccy)$/.test(h))
            map.currency = i;
    });
    return map;
}
function pick(arr, idx) { return (idx == null || idx < 0) ? '' : (arr[idx] ?? '').toString().trim(); }
function parseAmount(v, warnings) {
    if (v == null)
        return null;
    let s = v.toString().trim();
    if (!s)
        return null;
    // Replace comma decimal if no dot present but one comma
    if (s.indexOf('.') === -1 && (s.match(/,/g)?.length === 1)) {
        if (/^[0-9.,]+$/.test(s))
            s = s.replace(',', '.');
    }
    // remove currency symbols & thousands separators
    s = s.replace(/[$€£,\s]/g, '');
    const num = Number(s);
    if (!isFinite(num) || num === 0) {
        warnings.push('invalid-amount');
        return null;
    }
    if (num < 0) {
        warnings.push('neg-adjusted');
        return Number(Math.abs(num).toFixed(2));
    }
    return Number(num.toFixed(2));
}
function parseDate(v, warnings) {
    if (v === undefined || v === null)
        return todayIso();
    // Excel date serial number case
    if (typeof v === 'number') {
        // Excel serial (1900-based) valid range heuristic
        if (v > 0 && v < 60000) {
            const base = Date.UTC(1899, 11, 30); // Excel erroneously counts 1900-02-29; library often adjusts, but we mimic common base
            const ms = base + v * 86400000;
            const d = new Date(ms);
            if (!isNaN(d.getTime()))
                return d.toISOString().slice(0, 10);
        }
        else {
            // treat large number as timestamp ms maybe
            const d2 = new Date(v);
            if (!isNaN(d2.getTime()))
                return d2.toISOString().slice(0, 10);
        }
    }
    if (v instanceof Date && !isNaN(v.getTime()))
        return v.toISOString().slice(0, 10);
    const s = v.toString().trim();
    if (!s)
        return todayIso();
    let d = new Date(s);
    if (isNaN(d.getTime())) {
        const m = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/);
        if (m) {
            const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
            if (a > 12)
                d = new Date(`${m[3]}-${pad(b)}-${pad(a)}`);
            else
                d = new Date(`${m[3]}-${pad(a)}-${pad(b)}`);
        }
    }
    if (isNaN(d.getTime())) {
        warnings.push('date-fallback');
        return todayIso();
    }
    return d.toISOString().slice(0, 10);
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function sanitizeCurrency(v, warnings) {
    if (!v)
        return null;
    const s = v.toString().trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(s))
        return s;
    warnings.push('invalid-currency');
    return null;
}
function resolveDescription(cols, map, warnings) {
    if (map.description != null)
        return pick(cols, map.description);
    if (map.merchant != null)
        return pick(cols, map.merchant);
    // fallback: first non-empty non amount/date cell
    for (let i = 0; i < cols.length; i++) {
        if ([map.amount, map.date].includes(i))
            continue;
        const val = pick(cols, i);
        if (val) {
            warnings.push('guessed-description');
            return val;
        }
    }
    warnings.push('missing-description');
    return '';
}
function resolveDescriptionObject(row, headers, map, warnings) {
    if (map.description != null)
        return (row[headers[map.description]] || '').toString().trim();
    if (map.merchant != null)
        return (row[headers[map.merchant]] || '').toString().trim();
    for (let i = 0; i < headers.length; i++) {
        if ([map.amount, map.date].includes(i))
            continue;
        const val = (row[headers[i]] || '').toString().trim();
        if (val) {
            warnings.push('guessed-description');
            return val;
        }
    }
    warnings.push('missing-description');
    return '';
}
//# sourceMappingURL=importSpreadsheet.js.map