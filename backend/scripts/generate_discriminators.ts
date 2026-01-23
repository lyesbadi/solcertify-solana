
import * as crypto from 'crypto';

function sha256(input: string): Buffer {
    return crypto.createHash('sha256').update(input).digest();
}

function getDiscriminator(name: string): string {
    const hash = sha256(`account:${name}`);
    return JSON.stringify(Array.from(hash.slice(0, 8)));
}

function getInstructionDiscriminator(name: string): string {
    const hash = sha256(`global:${name}`);
    return JSON.stringify(Array.from(hash.slice(0, 8)));
}

console.log("--- Account Discriminators ---");
console.log("CertificationAuthority:", getDiscriminator("CertificationAuthority"));
console.log("CertifierProfile:", getDiscriminator("CertifierProfile"));
console.log("CertificationRequest:", getDiscriminator("CertificationRequest"));
console.log("Certificate:", getDiscriminator("Certificate"));
console.log("UserActivity:", getDiscriminator("UserActivity"));

console.log("\n--- Instruction Discriminators ---");
console.log("initialize:", getInstructionDiscriminator("initialize"));
console.log("add_certifier:", getInstructionDiscriminator("add_certifier"));
console.log("request_certification:", getInstructionDiscriminator("request_certification"));
console.log("approve_certification:", getInstructionDiscriminator("approve_certification"));
console.log("reject_certification:", getInstructionDiscriminator("reject_certification"));
console.log("remove_certifier:", getInstructionDiscriminator("remove_certifier"));
console.log("issue_certificate:", getInstructionDiscriminator("issue_certificate"));
console.log("transfer_certificate:", getInstructionDiscriminator("transfer_certificate"));
console.log("verify_certificate:", getInstructionDiscriminator("verify_certificate"));
