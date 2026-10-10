const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate 2FA secret
const generate2FASecret = async (email) => {
  const secret = speakeasy.generateSecret({
    name: `School Management (${email})`,
    length: 32
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode
  };
};

// Verify 2FA token
const verify2FAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};

module.exports = {
  generate2FASecret,
  verify2FAToken
};
