import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailProviderSendInput, EmailProviderSendResult } from '../email.types';
import Zavudev from "@zavudev/sdk";

@Injectable()
export class ZavuProvider implements EmailProvider {
    private client: any | null = null;

    constructor(private readonly config: ConfigService) { }

    async sendTemplate(input: EmailProviderSendInput): Promise<EmailProviderSendResult> {
        const senderId = this.config.get<string>('ZAVU_SENDER_ID');
        if (!senderId) {
            throw new Error('Missing ZAVU_SENDER_ID environment variable');
        }

        console.log('ZavuProvider.sendTemplate called with:', input);

        const zavu = this.getClient();
        const response = await zavu.messages.send(
            {
                to: input.to,
                channel: 'email',
                messageType: 'template',
                content: {
                    templateId: input.templateId,
                    templateVariables: input.templateVariables,
                },
            },
            {
                headers: {
                    'Zavu-Sender': senderId,
                },
            },
        );

        const messageId = response?.message?.id ? String(response.message.id) : undefined;

        return {
            provider: 'zavu',
            providerMessageId: messageId,
        };
    }

    private getClient() {
        if (this.client) return this.client;

        const apiKey = this.config.get<string>('ZAVU_API_KEY');
        if (!apiKey) {
            throw new Error('Missing ZAVU_API_KEY environment variable');
        }

        let ZavuCtor: any;
        try {
            const mod = Zavudev
            ZavuCtor =  Zavudev
        } catch {
            throw new Error('Package @zavudev/sdk is not installed');
        }

        this.client = new ZavuCtor({ apiKey });
        return this.client;
    }
}
