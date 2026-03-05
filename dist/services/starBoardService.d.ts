import { Client, ButtonInteraction } from 'discord.js';
export declare class StarBoardService {
    static featureRandomProfile(client: Client, guildId: string, channelId: string): Promise<void>;
    static handleStarInteraction(interaction: ButtonInteraction): Promise<import("discord.js").InteractionResponse<boolean> | undefined>;
}
