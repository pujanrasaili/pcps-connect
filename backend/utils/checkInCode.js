const { createSignedCode, verifySignedCode } = require("./signedCode");

// The code in the QR a student shows an organiser at the door (see
// POST /api/admin/check-in). A different purpose from certificate codes, so
// one can never be presented as the other. The signature is computed exactly
// as it was before signedCode.js existed, so QR codes already issued still work.
const createCheckInCode = (registrationId) => createSignedCode("check-in", registrationId);
const verifyCheckInCode = (code) => verifySignedCode("check-in", code);

module.exports = { createCheckInCode, verifyCheckInCode };
