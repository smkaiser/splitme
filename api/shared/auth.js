"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientPrincipal = getClientPrincipal;
exports.isAuthenticated = isAuthenticated;
exports.getAuthenticatedUser = getAuthenticatedUser;
function getClientPrincipal(req) {
    const header = req.headers.get('x-ms-client-principal');
    if (!header)
        return null;
    try {
        const decoded = Buffer.from(header, 'base64').toString('utf8');
        if (!decoded)
            return null;
        const parsed = JSON.parse(decoded);
        if (!parsed)
            return null;
        // normalise defaults
        const rolesSource = Array.isArray(parsed.roles)
            ? parsed.roles
            : Array.isArray(parsed.userRoles)
                ? parsed.userRoles
                : [];
        const claims = Array.isArray(parsed.claims) ? parsed.claims : [];
        return {
            ...parsed,
            roles: rolesSource,
            claims
        };
    }
    catch {
        return null;
    }
}
function isAuthenticated(principal) {
    if (!principal)
        return false;
    return Array.isArray(principal.roles) && principal.roles.includes('authenticated');
}
function getAuthenticatedUser(principal) {
    if (!isAuthenticated(principal))
        return null;
    const nameClaim = principal?.claims?.find(c => c.typ === 'name')?.val;
    const displayName = nameClaim || principal?.userDetails || 'User';
    return {
        id: principal.userId,
        name: displayName,
        provider: principal.identityProvider || 'unknown'
    };
}
//# sourceMappingURL=auth.js.map