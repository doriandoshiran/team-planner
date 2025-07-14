const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('View your work schedule')
    .addStringOption(option =>
      option.setName('month')
        .setDescription('Month to view (YYYY-MM)')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('swap')
    .setDescription('Request a shift swap')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to swap with')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Date to swap (YYYY-MM-DD)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for swap request')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Connect your Discord account to Team Planner')
    .addStringOption(option =>
      option.setName('token')
        .setDescription('Your connection token from the web app')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with Team Planner bot commands')
];

module.exports = commands;
