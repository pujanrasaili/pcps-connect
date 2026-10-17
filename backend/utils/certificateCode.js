const { createSignedCode, verifySignedCode } = require("./signedCode");

// Printed on an attendance certificate so anyone can confirm it's genuine
// (see GET /api/certificates/verify/:code). Deliberately a different purpose
// from check-in codes: a certificate code can't be used to check someone in.
const createCertificateCode = (registrationId) => createSignedCode("certificate", registrationId);
const verifyCertificateCode = (code) => verifySignedCode("certificate", code);

module.exports = { createCertificateCode, verifyCertificateCode };
