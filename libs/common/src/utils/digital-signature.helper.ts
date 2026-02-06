import * as crypto from 'crypto';

export class DigitalSignatureHelper {
    static signData(data: any, privateKey: string): string {
        const content = JSON.stringify(data);
        return crypto
            .createHmac('sha256', privateKey)
            .update(content)
            .digest('hex');
    }

    static verifySignature(data: any, signature: string, publicKey: string): boolean {
        const expected = this.signData(data, publicKey);
        return expected === signature;
    }
}
