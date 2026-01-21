
const crypto = require('crypto');

function sighash(nameSpace, name) {
    const preimage = `${nameSpace}:${name}`;
    return crypto.createHash('sha256').update(preimage).digest().slice(0, 8).toJSON().data;
}

const instructions = [
    "initialize",
    "add_certifier",
    "remove_certifier",
    "issue_certificate",
    "transfer_certificate",
    "verify_certificate"
];

const accounts = [
    "CertificationAuthority",
    "Certificate",
    "UserActivity"
];

console.log("Instructions:");
instructions.forEach(ix => {
    // Anchor converts camelCase in IDL to snake_case for sighash, but here we provide snake_case directly
    // Wait, if IDL has "addCertifier", JS client uses "addCertifier" to match, but hashes "global:add_certifier"?
    // Yes.
    console.log(`"${toCamel(ix)}": [${sighash("global", ix)}],`);
});

console.log("\nAccounts:");
accounts.forEach(acc => {
    console.log(`"${acc}": [${sighash("account", acc)}],`);
});

function toCamel(s) {
    return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}
