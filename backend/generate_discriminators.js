/**
 * Script pour generer les discriminators Anchor
 * Usage: node generate_discriminators.js
 */

const crypto = require('crypto');

function getDiscriminator(name) {
    // Anchor utilise "global:<snake_case_name>" pour les instructions
    const preimage = `global:${name}`;
    const hash = crypto.createHash('sha256').update(preimage).digest();
    return Array.from(hash.slice(0, 8));
}

const instructions = [
    'initialize',
    'add_certifier',
    'remove_certifier',
    'issue_certificate',
    'transfer_certificate',
    'verify_certificate',
    'request_certification',
    'approve_certification',
    'reject_certification'
];

console.log('=== Discriminators Anchor ===\n');
instructions.forEach(name => {
    const disc = getDiscriminator(name);
    console.log(`${name}: [${disc.join(', ')}]`);
});

// Account discriminators use "account:<AccountName>"
function getAccountDiscriminator(name) {
    const preimage = `account:${name}`;
    const hash = crypto.createHash('sha256').update(preimage).digest();
    return Array.from(hash.slice(0, 8));
}

const accounts = [
    'CertificationAuthority',
    'Certificate',
    'UserActivity',
    'CertificationRequest'
];

console.log('\n=== Account Discriminators ===\n');
accounts.forEach(name => {
    const disc = getAccountDiscriminator(name);
    console.log(`${name}: [${disc.join(', ')}]`);
});
