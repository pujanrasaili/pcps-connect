const { createSignedCode, verifySignedCode } = require("./signedCode");

// Printed on an attendance certificate so anyone can confirm it's genuine
// (see GET /api/certificates/verify/:code). Deliberately a different purpose
// from check-in codes: a certificate code can't be used to check someone in.
const createCertificateCode = (registrationId) => createSignedCode("certificate", registrationId);
const verifyCertificateCode = (code) => verifySignedCode("certificate", code);

// The same idea for a volunteering certificate; its own purpose so the two kinds can't be swapped.
const createVolunteerCertificateCode = (volunteerId) => createSignedCode("volunteer-certificate", volunteerId);
const verifyVolunteerCertificateCode = (code) => verifySignedCode("volunteer-certificate", code);

module.exports = { createCertificateCode, verifyCertificateCode, createVolunteerCertificateCode, verifyVolunteerCertificateCode };
