import Collection from '@discordjs/collection';
import { Client, Guild, GuildMember, Intents, TextChannel } from 'discord.js';

import { ProcessCommand } from './command_handler';
import { AttendingServer } from './server';
import { PostSlashCommands } from './slash_commands';
import { ProcessButtonPress } from './button_handler';

import dotenv from 'dotenv';
import gcs_creds from '../gcs_service_account_key.json';
import fbs_creds from '../fbs_service_account_key.json';

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

if (process.env.BOB_BOT_TOKEN === undefined || process.env.BOB_APP_ID === undefined) {
    throw new Error('Missing token or id!');
}

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
    ]
});

initializeApp({
    credential: cert(fbs_creds)
});

const servers: Collection<Guild, AttendingServer> = new Collection();
const firebase_db: FirebaseFirestore.Firestore = getFirestore();
console.log('Connected to Firebase database');

client.login(process.env.BOB_BOT_TOKEN).catch((e: Error) => {
    console.error('Login Unsuccessful. Check BOBs credentials.');
    throw e;
});

client.on('error', (error) => {
    console.error(error);
});

client.on('ready', async () => {
    console.log('B.O.B. V3');

    if (client.user === null) { // ? what's the difference between null and error in client.login
        throw new Error('Login Unsuccessful. Check BOB\'s Discord Credentials');
    }

    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Scanning servers I am a part of...');

    const guilds = await client.guilds.fetch(); // guild is a server
    console.log(`Found ${guilds.size} server(s)`);
    const full_guilds = await Promise.all(guilds.map(guild => guild.fetch()));
    // * full guild is all the servers this BOB instance is part of

    // Connecting to the attendance sheet
    let attendance_doc: GoogleSpreadsheet | null = null;
    if (process.env.BOB_GOOGLE_SHEET_ID !== undefined) {
        attendance_doc = new GoogleSpreadsheet(process.env.BOB_GOOGLE_SHEET_ID);
        await attendance_doc.useServiceAccountAuth(gcs_creds);
        console.log('Connected to Google sheets.');
    }

    await Promise.all(full_guilds.map(guild =>
        AttendingServer.Create(client, guild, firebase_db, attendance_doc)
            .then(server => servers.set(guild, server))
            .then(() => PostSlashCommands(guild))
            .catch((err: Error) => {
                console.error(`An error occured in processing servers during startup of server: ${guild.name}. ${err.stack}`);
            }) // ? where's the error handlers for the servers that failed to setup?
    ));
    // ? throw uncaught here? promise.all is all or nothing

    console.log('Ready to go!');

    await Promise.all(full_guilds.map(async guild => {
        const server = servers.get(guild);
        if (server !== undefined) {
            await server.AutoScheduleUpdates(server);
        }
    }));
});

client.on('guildCreate', async guild => {
    await JoinGuild(guild);
});

client.on('interactionCreate', async interaction => {
    //Only care about if the interaction was a command or a button
    if (!interaction.isCommand() && !interaction.isButton()) return;

    //Don't care about the interaction if done through dms
    if (interaction.guild === null) {
        await interaction.reply('Sorry, I dont respond to direct messages.');
        return;
    }

    const server = servers.get(interaction.guild) ?? await JoinGuild(interaction.guild);

    await server.EnsureHasRole(interaction.member as GuildMember);

    //If the interactin is a Command
    if (interaction.isCommand()) {
        await ProcessCommand(server, interaction);
    }
    //if the interaction is a button
    else if (interaction.isButton()) {
        await ProcessButtonPress(server, interaction);
    }
});

// updates user status of either joining a vc or leaving one
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member?.id !== newState.member?.id) {
        console.error('voiceStateUpdate: members don\'t match');
    }
    if (oldState.guild.id !== newState.guild.id) {
        console.error('voiceStateUpdate: servers don\'t match');
    }

    // * added nullish coalescing
    const server = servers.get(oldState.guild) ?? await JoinGuild(oldState.guild);
    const member = oldState.member;
    await server.EnsureHasRole(member as GuildMember);

    // if a user joins a vc
    if (oldState.channel === null && newState.channel !== null) {
        // if not a helper, mark as being helped
        server.UpdateMemberJoinedVC(member as GuildMember);
    }

    // if a user leaves a vc
    if (oldState.channel !== null && newState.channel === null) {
        // if not a helper and marked as being helped
        // send the person who left vc a dm to fill out a form
        // mark as not currently being helped
        await server.UpdateMemberLeftVC(member as GuildMember);
    }
});

// incase queue message gets deleted
client.on('messageDelete', async message => {
    if (message === null) {
        console.error("Recognized a message deletion without a message");
        return;
    }
    if (message.author?.id !== process.env.BOB_APP_ID) {
        return;
    }
    if (message.guild === null) {
        console.error("Recognized a message deletion without a guild");
        return;
    }

    const server = servers.get(message.guild) ?? await JoinGuild(message.guild);

    // ? non null assertion or typecasting
    // ? also what if message.member is actually null?
    await server.EnsureHasRole(message.member as GuildMember);

    const channel = message.channel as TextChannel;
    const category = channel.parent;

    if (category === null) {
        return;
    }

    await server.EnsureQueueSafe(category.name);
    await server.ForceQueueUpdate(category.name);
});

client.on('guildMemberAdd', async member => {
    const server = servers.get(member.guild) ?? await JoinGuild(member.guild);
    await server.EnsureHasRole(member as GuildMember);
});

async function JoinGuild(guild: Guild): Promise<AttendingServer> {
    console.log(`Joining guild ${guild.name}`);
    const server = await AttendingServer.Create(client, guild, firebase_db);
    await PostSlashCommands(guild);
    servers.set(guild, server);
    return server;
}