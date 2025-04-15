const speakeasy = require('speakeasy');

const rawSecret = 'N4W2 SGU3 6UZ6 EWGC XEBF FQFY OEMT 5BHH U4BU WINE MSPP SYNE QVBA';

// Loại bỏ dấu cách
const secret = rawSecret.replace(/\s+/g, '');

const token = speakeasy.totp({
  secret: secret,
  encoding: 'base32'
});

console.log('OTP:', token);

// login address: https://kdp.amazon.com/bookshelf 
