export enum EmbedColor {
    Success = 0x00FF00,    // Green
    Error = 0xFF0000,       // Red
    Neutral = 0xFBA736,      // Orange
    Warning = 0xFFFF00,     // Yellow
    NeedName = 0x0000FF    // Blue
}

// export interface EmbedMessage {
//     color: EmbedColor,
//     title: string,
//     timestamp: Date
// }

export function SimpleEmbed(message: string, color = EmbedColor.Neutral): any {
    if (message.length > 256) {
        return {
            embeds: [{
                color: color,
                title: message,
                timestamp: new Date(),
            }]
        };
    } else {
        // For future: if longer than 4096 characters break up into more than one message/embed
        return {
            embeds: [{
                color: color,
                description: message,
                timestamp: new Date(),
            }]
        };
    }
}