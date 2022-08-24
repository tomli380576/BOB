import { ButtonInteraction, GuildMember } from "discord.js";
import { AttendingServer } from "./server";

export async function ProcessButtonPress(server: AttendingServer, interaction: ButtonInteraction): Promise<void> {
    //a space separates the type of interaction and the name of the queue channel
    // TODO: extract parsing into a separate function
    // TODO: interactionType should also be another type
    const pos = interaction.customId.indexOf(" ");
    const interactionType = interaction.customId.substring(0, pos);
    const queue_name = interaction.customId.substring(pos + 1);

    if (!(interaction.member instanceof GuildMember)) {
        console.error(`Recieved an interaction without a member from user ${interaction.user} on server ${interaction.guild}`);
        return;
    }

    await interaction.deferUpdate();

    switch (interactionType) {
        case 'join': {
            await server.EnqueueUser(queue_name, interaction.member).catch(async (errstr: Error) => {
                if (interaction.member instanceof GuildMember) {
                    await interaction.member.send(errstr.message);
                }
            });
            break;
        }
        case 'leave': {
            await server.RemoveMemberFromQueues(interaction.member).catch(async (errstr: Error) => {
                if (interaction.member instanceof GuildMember && errstr.name === 'UserError') {
                    await interaction.member.send(errstr.message);
                }
            });
            break;
        }
        case 'notif': {
            await server.JoinNotifications(queue_name, interaction.member).catch(async (errstr: Error) => {
                if (interaction.member instanceof GuildMember && errstr.name === 'UserError') {
                    await interaction.member.send(errstr.message);
                }
            });
            break;
        }
        case 'removeN': {
            await server.RemoveNotifications(queue_name, interaction.member).catch(async (errstr: Error) => {
                if (interaction.member instanceof GuildMember && errstr.name === 'UserError') {
                    await interaction.member.send(errstr.message);
                }
            });
            break;
        }
        default: {
            console.error('Received invalid button interaction');
            break;
        }
    }
}