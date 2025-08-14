require('dotenv').config();
const express = require("express");
const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  REST, 
  Routes, 
  EmbedBuilder 
} = require('discord.js');
const { DisTube } = require('distube');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { YouTubePlugin } = require('@distube/youtube');
const { readdirSync } = require('fs');
const { join } = require('path');

// 🌐 Servidor Express para Render
const app = express();
app.get("/", (req, res) => res.send("Bot activo 🚀"));
app.listen(process.env.PORT || 3000, () => console.log("Ping server listo en el puerto 3000"));

// 🧠 Crear cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.prefix = process.env.PREFIX || '!';
client.commands = new Collection();
client.slashCommands = new Collection();
client.canalPredeterminado = new Map();

// 🎶 Inicializar DisTube
client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  plugins: [
    new SoundCloudPlugin(),
    new YouTubePlugin(),
    new YtDlpPlugin({ update: true })
  ]
});

// 📂 Cargar comandos desde raíz
const rootFiles = readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'index.js');
const slashCommandsArray = [];

for (const file of rootFiles) {
  try {
    const command = require(join(__dirname, file));
    
    // Comando prefix
    if (command.name && typeof command.execute === 'function') {
      client.commands.set(command.name, command);
      console.log(`📦 Comando prefix cargado: ${file}`);
    }

    // Comando slash
    if (command.data?.name && typeof command.execute === 'function') {
      client.slashCommands.set(command.data.name, command);
      slashCommandsArray.push(command.data.toJSON());
      console.log(`📦 Comando slash cargado: ${file}`);
    }

  } catch (err) {
    console.warn(`⚠️ Error al cargar ${file}:`, err);
  }
}

// 🚀 Evento ready
client.once('ready', async () => {
  console.log(`✅ Conectado como ${client.user.tag}`);
  client.user.setActivity(`${client.prefix}help`, { type: 3 });

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: slashCommandsArray }
    );
    console.log('📡 Comandos slash registrados correctamente.');
  } catch (err) {
    console.error('❌ Error al registrar comandos slash:', err);
  }

  // 🔗 Invitación
  const inviteLink = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=274877990912&scope=bot%20applications.commands`;
  console.log(`🔗 Invitá el bot con este link:\n${inviteLink}`);
});

// 📩 Ejecutar comandos prefix
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(client.prefix)) return;
  const args = message.content.slice(client.prefix.length).trim().split(/ +/);
  const cmdName = args.shift().toLowerCase();
  const command = client.commands.get(cmdName);
  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(`❌ Error en comando prefix "${cmdName}":`, err);
    message.reply('❌ Error al ejecutar el comando.');
  }
});

// ⚡ Ejecutar comandos slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(`❌ Error en comando slash "${interaction.commandName}":`, err);
    const errorReply = { content: '❌ Error al ejecutar el comando.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});

// 🎧 Eventos de DisTube (pegá los tuyos acá)

// 🧼 Captura de errores globales
process.on('unhandledRejection', err => {
  console.error('❌ Rechazo no manejado:', err);
});

process.on('uncaughtException', err => {
  console.error('💥 Excepción no capturada:', err);
});

// 🔐 Iniciar sesión
client.login(process.env.TOKEN);
