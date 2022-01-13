import * as crypto from 'crypto'

const SIGN_ALGORITHM = 'SHA256'

export default class SignatureUtils {
  static sign(message, privateKey) {
    return crypto
      .sign(SIGN_ALGORITHM, Buffer.from(message), privateKey)
      .toString('base64')
  }

  static verify(message, signature, publicKey) {
    const isAuthentic = crypto.verify(
      SIGN_ALGORITHM,
      Buffer.from(message),
      publicKey,
      Buffer.from(signature, 'base64')
    )
    return isAuthentic
  }

  // copy pasted from https://stackoverflow.com/questions/8520973/how-to-create-a-pair-private-public-keys-using-node-js-crypto
  // TODO: make this more secure (and understand it)
  static generateKeyPairSync() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })
  }
}

