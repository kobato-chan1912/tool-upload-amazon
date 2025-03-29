const speakeasy = require('speakeasy');

const rawSecret = 'SVHK FWOC ZBD4 4OAZ WAOL TTN2 DX4K YCAD NEM7 FJ3X RNHK FQX2 SDWA';

// Loại bỏ dấu cách
const secret = rawSecret.replace(/\s+/g, '');

const token = speakeasy.totp({
  secret: secret,
  encoding: 'base32'
});

console.log('OTP:', token);

// login address: https://kdp.amazon.com/bookshelf 
