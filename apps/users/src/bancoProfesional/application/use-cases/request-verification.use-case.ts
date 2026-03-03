import { Injectable } from '@nestjs/common';
import { MailService } from '@app/common';
import * as crypto from 'crypto';

@Injectable()
export class RequestVerificationUseCase {
    private verificationCodes = new Map<string, { code: string; expires: Date }>();

    constructor(private readonly mailService: MailService) { }

    async execute(email: string) {
        const normalizedEmail = String(email).trim().toLowerCase();
        const code = crypto.randomInt(100000, 999999).toString();
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15);

        this.verificationCodes.set(normalizedEmail, { code, expires });

        await this.mailService.sendPasswordResetEmail(normalizedEmail, code, 'Postulante');
        return { message: 'Código enviado' };
    }

    verifyCode(email: string, code: string): boolean {
        const normalizedEmail = String(email).trim().toLowerCase();
        const verification = this.verificationCodes.get(normalizedEmail);

        if (
            !verification ||
            String(verification.code) !== String(code).trim() ||
            verification.expires < new Date()
        ) {
            return false;
        }

        this.verificationCodes.delete(normalizedEmail);
        return true;
    }
}
