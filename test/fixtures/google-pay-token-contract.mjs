// Sanitized synthetic fixture. It preserves the nested JSON-string and escape
// characteristics of the accepted Google Pay payload without containing real
// payment material.
export const RAW_GOOGLE_PAY_TOKEN = String.raw`{"signature":"TEST+SIGNATURE/\\u003d","intermediateSigningKey":{"signedKey":"{\"keyValue\":\"TEST+KEY/\\u003d\\u003d\",\"keyExpiration\":\"1787008495995\"}","signatures":["TEST+INTERMEDIATE/\\u003d"]},"protocolVersion":"ECv2","signedMessage":"{\"encryptedMessage\":\"TEST+CIPHERTEXT/\\u003d\\u003d\",\"ephemeralPublicKey\":\"TEST+PUBLIC/\\u003d\",\"tag\":\"TEST+TAG/\\u003d\"}"}`;

// Generated independently during contract intake and then frozen. Production
// implementations must match this exact byte-for-byte result.
export const EXPECTED_ENCODED_PAYLOAD = 'IntcInNpZ25hdHVyZVwiOlwiVEVTVCtTSUdOQVRVUkUvXFxcXHUwMDNkXCIsXCJpbnRlcm1lZGlhdGVTaWduaW5nS2V5XCI6e1wic2lnbmVkS2V5XCI6XCJ7XFxcImtleVZhbHVlXFxcIjpcXFwiVEVTVCtLRVkvXFxcXHUwMDNkXFxcXHUwMDNkXFxcIixcXFwia2V5RXhwaXJhdGlvblxcXCI6XFxcIjE3ODcwMDg0OTU5OTVcXFwifVwiLFwic2lnbmF0dXJlc1wiOltcIlRFU1QrSU5URVJNRURJQVRFL1xcXFx1MDAzZFwiXX0sXCJwcm90b2NvbFZlcnNpb25cIjpcIkVDdjJcIixcInNpZ25lZE1lc3NhZ2VcIjpcIntcXFwiZW5jcnlwdGVkTWVzc2FnZVxcXCI6XFxcIlRFU1QrQ0lQSEVSVEVYVC9cXFxcdTAwM2RcXFxcdTAwM2RcXFwiLFxcXCJlcGhlbWVyYWxQdWJsaWNLZXlcXFwiOlxcXCJURVNUK1BVQkxJQy9cXFxcdTAwM2RcXFwiLFxcXCJ0YWdcXFwiOlxcXCJURVNUK1RBRy9cXFxcdTAwM2RcXFwifVwifSI=';
