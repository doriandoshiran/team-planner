const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const SwapRequest = require('../models/SwapRequest');

class DiscordService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.guildId = process.env.DISCORD_GUILD_ID;
    this.channelId = process.env.DISCORD_CHANNEL_ID;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connectionTimeout = null;
    
    this.initializeClient();
  }

  initializeClient() {
    try {
      // Check if Discord bot token is provided
      if (!process.env.DISCORD_BOT_TOKEN) {
        console.log('Discord bot token not provided, Discord integration disabled');
        return;
      }

      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages
        ],
        ws: {
          timeout: 45000, // Increased timeout to 45 seconds
          compress: false,
          large_threshold: 50
        },
        rest: {
          timeout: 30000,
          retries: 3
        }
      });

      this.setupEventHandlers();
      this.login();
    } catch (error) {
      console.error('Error initializing Discord client:', error);
      this.scheduleReconnect();
    }
  }

  async login() {
    try {
      console.log('Attempting Discord bot login...');
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        console.log('Discord connection timeout, retrying...');
        this.scheduleReconnect();
      }, 60000); // 60 second timeout

      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      
      // Clear timeout on successful login
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      console.log('Discord bot login initiated successfully');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Discord bot login failed:', error);
      
      // Clear timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    this.client.once('ready', async () => {
      console.log(`Discord bot ready! Logged in as ${this.client.user.tag}`);
      this.isReady = true;
      this.reconnectAttempts = 0;
      
      // Clear any pending timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      // Register commands with delay
      setTimeout(async () => {
        await this.registerSlashCommands();
      }, 5000);
    });

    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (interaction.isCommand()) {
          await this.handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
          await this.handleButtonInteraction(interaction);
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
      }
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
      this.isReady = false;
    });

    this.client.on('disconnect', () => {
      console.log('Discord bot disconnected');
      this.isReady = false;
      this.scheduleReconnect();
    });

    this.client.on('reconnecting', () => {
      console.log('Discord bot reconnecting...');
      this.isReady = false;
    });

    // Handle WebSocket errors specifically
    this.client.ws.on('error', (error) => {
      console.error('Discord WebSocket error:', error);
      this.isReady = false;
    });

    // Handle rate limiting
    this.client.rest.on('rateLimited', (info) => {
      console.log(`Rate limited: ${info.timeToReset}ms timeout, route: ${info.route}`);
    });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max Discord reconnection attempts reached. Discord integration disabled.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000); // Max 60s delay
    
    console.log(`Scheduling Discord reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isReady) {
        console.log(`Discord reconnection attempt ${this.reconnectAttempts}`);
        this.initializeClient();
      }
    }, delay);
  }

  async registerSlashCommands() {
    if (!this.isReady || !this.client) {
      console.log('Discord bot not ready, skipping command registration');
      return;
    }

    const commands = [
      new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('View your work schedule')
        .addStringOption(option =>
          option.setName('month')
            .setDescription('Month to view (YYYY-MM format)')
            .setRequired(false)
        ),
      
      new SlashCommandBuilder()
        .setName('team-schedule')
        .setDescription('View team schedules'),
      
      new SlashCommandBuilder()
        .setName('link-account')
        .setDescription('Link your Discord account to Team Planner')
        .addStringOption(option =>
          option.setName('email')
            .setDescription('Your Team Planner email address')
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show available commands')
    ];

    try {
      if (this.guildId) {
        const guild = this.client.guilds.cache.get(this.guildId);
        if (guild) {
          await guild.commands.set(commands);
          console.log('Discord slash commands registered for guild');
        } else {
          console.log('Guild not found, registering commands globally');
          await this.client.application.commands.set(commands);
          console.log('Discord slash commands registered globally');
        }
      } else {
        await this.client.application.commands.set(commands);
        console.log('Discord slash commands registered globally');
      }
    } catch (error) {
      console.error('Error registering Discord commands:', error);
    }
  }

  async handleSlashCommand(interaction) {
    const { commandName, options, user } = interaction;

    try {
      switch (commandName) {
        case 'schedule':
          await this.handleScheduleCommand(interaction);
          break;
        case 'team-schedule':
          await this.handleTeamScheduleCommand(interaction);
          break;
        case 'link-account':
          await this.handleLinkAccountCommand(interaction);
          break;
        case 'help':
          await this.handleHelpCommand(interaction);
          break;
        default:
          await interaction.reply({ content: 'Unknown command!', ephemeral: true });
      }
    } catch (error) {
      console.error('Error handling slash command:', error);
      try {
        await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
      } catch (replyError) {
        console.error('Error sending error response:', replyError);
      }
    }
  }

  async handleScheduleCommand(interaction) {
    const discordUser = await this.findUserByDiscordId(interaction.user.id);
    if (!discordUser) {
      await interaction.reply({
        content: '❌ Your Discord account is not linked. Use `/link-account` to connect your account.',
        ephemeral: true
      });
      return;
    }

    const month = interaction.options.getString('month') || this.getCurrentMonth();
    const schedules = await this.getUserSchedule(discordUser._id, month);

    const embed = new EmbedBuilder()
      .setTitle(`📅 ${discordUser.name}'s Schedule`)
      .setDescription(`Schedule for ${month}`)
      .setColor(0x3b82f6)
      .setTimestamp();

    if (schedules.length === 0) {
      embed.addFields({ name: 'No Schedule', value: 'No schedule entries found for this month.' });
    } else {
      const scheduleText = schedules
        .map(s => `**${s.date}:** ${this.formatScheduleLocation(s.location)}`)
        .join('\n');
      
      embed.addFields({ name: 'Schedule', value: scheduleText.substring(0, 1024) });
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open Full Schedule')
          .setStyle(ButtonStyle.Link)
          .setURL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/schedule`)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleTeamScheduleCommand(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('👥 Team Schedule')
      .setDescription('View the complete team schedule with all members and their availability.')
      .setColor(0x10b981)
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Open Team Schedule')
          .setStyle(ButtonStyle.Link)
          .setURL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/schedule`)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleLinkAccountCommand(interaction) {
    const email = interaction.options.getString('email');
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        await interaction.reply({
          content: '❌ No account found with that email address.',
          ephemeral: true
        });
        return;
      }

      if (user.discordId && user.discordId !== discordId) {
        await interaction.reply({
          content: '❌ This email is already linked to another Discord account.',
          ephemeral: true
        });
        return;
      }

      await User.findByIdAndUpdate(user._id, {
        discordId: discordId,
        discordUsername: interaction.user.username
      });

      await interaction.reply({
        content: `✅ Successfully linked your Discord account to ${email}!`,
        ephemeral: true
      });

      console.log(`Discord account linked: ${interaction.user.username} (${discordId}) -> ${email}`);
    } catch (error) {
      console.error('Error linking Discord account:', error);
      await interaction.reply({
        content: '❌ An error occurred while linking your account.',
        ephemeral: true
      });
    }
  }

  async handleHelpCommand(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Team Planner Bot Commands')
      .setDescription('Here are the available commands:')
      .setColor(0x8b5cf6)
      .addFields(
        { name: '📅 /schedule', value: 'View your work schedule', inline: true },
        { name: '👥 /team-schedule', value: 'View team schedules', inline: true },
        { name: '🔗 /link-account', value: 'Link your Discord account', inline: true },
        { name: '❓ /help', value: 'Show this help message', inline: true }
      )
      .setFooter({ text: 'Team Planner Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  async handleButtonInteraction(interaction) {
    const [action, swapRequestId] = interaction.customId.split('_');

    if (action === 'approve' || action === 'deny') {
      await this.handleSwapResponse(interaction, action, swapRequestId);
    }
  }

  async handleSwapResponse(interaction, action, swapRequestId) {
    try {
      const discordUser = await this.findUserByDiscordId(interaction.user.id);
      if (!discordUser) {
        await interaction.reply({
          content: '❌ Your Discord account is not linked.',
          ephemeral: true
        });
        return;
      }

      const swapRequest = await SwapRequest.findById(swapRequestId)
        .populate('requester', 'name email')
        .populate('targetUser', 'name email');

      if (!swapRequest) {
        await interaction.reply({
          content: '❌ Swap request not found.',
          ephemeral: true
        });
        return;
      }

      if (swapRequest.targetUser._id.toString() !== discordUser._id.toString()) {
        await interaction.reply({
          content: '❌ You can only respond to swap requests directed to you.',
          ephemeral: true
        });
        return;
      }

      if (swapRequest.status !== 'pending') {
        await interaction.reply({
          content: `❌ This swap request has already been ${swapRequest.status}.`,
          ephemeral: true
        });
        return;
      }

      // Update swap request
      swapRequest.status = action === 'approve' ? 'approved' : 'denied';
      swapRequest.respondedAt = new Date();
      await swapRequest.save();

      // If approved, swap the schedules
      if (action === 'approve') {
        await this.performScheduleSwap(swapRequest);
      }

      // Send response notification
      await this.sendSwapResponseNotification(swapRequest, action);

      const embed = new EmbedBuilder()
        .setTitle(`✅ Swap Request ${action === 'approve' ? 'Approved' : 'Denied'}`)
        .setDescription(`You have ${action === 'approve' ? 'approved' : 'denied'} the swap request from ${swapRequest.requester.name}.`)
        .setColor(action === 'approve' ? 0x10b981 : 0xef4444)
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('Error handling swap response:', error);
      try {
        await interaction.reply({
          content: '❌ An error occurred while processing your response.',
          ephemeral: true
        });
      } catch (replyError) {
        console.error('Error sending error response:', replyError);
      }
    }
  }

  // Send test notification for Discord settings
  async sendTestNotification(discordId, message) {
    if (!this.isReady || !this.client) {
      console.log('Discord service not ready for test notification');
      return false;
    }

    try {
      const discordUser = await this.client.users.fetch(discordId);
      
      const embed = new EmbedBuilder()
        .setTitle('🧪 Test Notification')
        .setDescription(message)
        .setColor(0x3b82f6)
        .setTimestamp()
        .setFooter({ text: 'Team Planner - Test Message' });

      await discordUser.send({ embeds: [embed] });
      console.log(`Test notification sent to Discord ID: ${discordId}`);
      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  async sendSwapRequestNotification(swapRequest, requesterUser, targetUser) {
    if (!this.isReady || !this.client) return false;

    try {
      const embed = new EmbedBuilder()
        .setTitle('🔄 New Shift Swap Request')
        .setDescription(`**${requesterUser.name}** wants to swap shifts with you!`)
        .addFields(
          { name: '📅 Date', value: swapRequest.requestedDate, inline: true },
          { name: '💬 Reason', value: swapRequest.reason || 'No reason provided', inline: false }
        )
        .setColor(0xf59e0b)
        .setTimestamp()
        .setFooter({ text: 'Team Planner' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`approve_${swapRequest._id}`)
            .setLabel('✅ Approve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`deny_${swapRequest._id}`)
            .setLabel('❌ Deny')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel('🌐 Open App')
            .setStyle(ButtonStyle.Link)
            .setURL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/schedule`)
        );

      // Send DM to target user
      if (targetUser.discordId) {
        try {
          const discordUser = await this.client.users.fetch(targetUser.discordId);
          await discordUser.send({ embeds: [embed], components: [row] });
          console.log(`Swap request DM sent to ${targetUser.name}`);
        } catch (error) {
          console.error(`Failed to send DM to ${targetUser.name}:`, error);
          await this.sendChannelNotification(embed, row);
        }
      } else {
        await this.sendChannelNotification(embed, row);
      }

      return true;
    } catch (error) {
      console.error('Error sending swap request notification:', error);
      return false;
    }
  }

  async sendSwapResponseNotification(swapRequest, action) {
    if (!this.isReady || !this.client) return false;

    try {
      const requester = await User.findById(swapRequest.requester);
      if (!requester || !requester.discordId) return false;

      const embed = new EmbedBuilder()
        .setTitle(`${action === 'approve' ? '✅' : '❌'} Swap Request ${action === 'approve' ? 'Approved' : 'Denied'}`)
        .setDescription(`Your swap request for **${swapRequest.requestedDate}** has been ${action === 'approve' ? 'approved' : 'denied'} by ${swapRequest.targetUser.name}.`)
        .setColor(action === 'approve' ? 0x10b981 : 0xef4444)
        .setTimestamp()
        .setFooter({ text: 'Team Planner' });

      if (action === 'approve') {
        embed.addFields({ name: '🎉 Great News!', value: 'Your schedules have been automatically swapped.' });
      }

      const discordUser = await this.client.users.fetch(requester.discordId);
      await discordUser.send({ embeds: [embed] });

      console.log(`Swap response notification sent to ${requester.name}`);
      return true;
    } catch (error) {
      console.error('Error sending swap response notification:', error);
      return false;
    }
  }

  async sendScheduleUpdateNotification(userId, updateDetails) {
    if (!this.isReady || !this.client) return false;

    try {
      const user = await User.findById(userId);
      if (!user || !user.discordId) return false;

      const embed = new EmbedBuilder()
        .setTitle('📅 Schedule Updated')
        .setDescription('Your work schedule has been updated by an administrator.')
        .addFields(
          { name: '📅 Date', value: updateDetails.date, inline: true },
          { name: '📍 Location', value: updateDetails.location, inline: true }
        )
        .setColor(0x8b5cf6)
        .setTimestamp()
        .setFooter({ text: 'Team Planner' });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('🌐 View Schedule')
            .setStyle(ButtonStyle.Link)
            .setURL(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/schedule`)
        );

      const discordUser = await this.client.users.fetch(user.discordId);
      await discordUser.send({ embeds: [embed], components: [row] });

      console.log(`Schedule update notification sent to ${user.name}`);
      return true;
    } catch (error) {
      console.error('Error sending schedule update notification:', error);
      return false;
    }
  }

  async sendChannelNotification(embed, components = null) {
    if (!this.isReady || !this.channelId || !this.client) return false;

    try {
      const channel = await this.client.channels.fetch(this.channelId);
      const message = { embeds: [embed] };
      if (components) message.components = [components];
      
      await channel.send(message);
      return true;
    } catch (error) {
      console.error('Error sending channel notification:', error);
      return false;
    }
  }

  async findUserByDiscordId(discordId) {
    return await User.findOne({ discordId });
  }

  async getUserSchedule(userId, month) {
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    const endDate = `${year}-${monthNum}-31`;

    return await Schedule.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
  }

  async performScheduleSwap(swapRequest) {
    const requesterSchedule = await Schedule.findOne({
      userId: swapRequest.requester,
      date: swapRequest.requestedDate
    });

    const targetSchedule = await Schedule.findOne({
      userId: swapRequest.targetUser,
      date: swapRequest.requestedDate
    });

    if (requesterSchedule && targetSchedule) {
      const tempLocation = requesterSchedule.location;
      requesterSchedule.location = targetSchedule.location;
      targetSchedule.location = tempLocation;

      await requesterSchedule.save();
      await targetSchedule.save();

      console.log(`Schedule swap completed for ${swapRequest.requestedDate}`);
    }
  }

  formatScheduleLocation(location) {
    if (typeof location === 'object' && location.type) {
      return location.reason ? `${location.type} (${location.reason})` : location.type;
    }
    return location || 'Not scheduled';
  }

  getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Graceful shutdown
  async destroy() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.client) {
      try {
        this.client.destroy();
        console.log('Discord service destroyed');
      } catch (error) {
        console.error('Error destroying Discord client:', error);
      }
    }
    
    this.isReady = false;
  }
}

// Create singleton instance with error handling
let discordServiceInstance = null;

try {
  discordServiceInstance = new DiscordService();
} catch (error) {
  console.error('Failed to initialize Discord service:', error);
  // Create a mock service that gracefully handles calls
  discordServiceInstance = {
    isReady: false,
    sendTestNotification: async () => false,
    sendSwapRequestNotification: async () => false,
    sendSwapResponseNotification: async () => false,
    sendScheduleUpdateNotification: async () => false,
    destroy: async () => {}
  };
}

module.exports = discordServiceInstance;
