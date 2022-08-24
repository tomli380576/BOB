import { MessageEmbedOptions } from "discord.js";

export enum EmbedColor {
    Success = 0x00FF00,      // Green
    Error = 0xFF0000,     // Red
    Neutral = 0xFBA736,     // Orange
    Warning = 0xFFFF00,    // Yellow
    NeedName = 0x0000FF,   // Blue
}

// Condition types based on interaction
// TODO: Add interaction param

export function SimpleEmbed(message: string, color = EmbedColor.Neutral): { embeds: MessageEmbedOptions[] } {
    if (message.length > 256) {
        return {
            embeds: [{
                color: color,
                title: message,
                timestamp: new Date(),
                author: {
                    name: 'BOBv3',
                    iconURL: 'https://i.postimg.cc/dVkg4XFf/BOB-pfp.png'
                },
            }]
        };
    } else {
        // For future: if longer than 4096 characters break up into more than one message/embed
        return {
            embeds: [{
                color: color,
                description: message,
                timestamp: new Date(),
                // TODO author: { name: 'BOBv3', iconURL: 'https://i.postimg.cc/dVkg4XFf/BOB-pfp.png' },
            }]
        };
    }
}