/*
 * Created on Wed Jan 27 2021
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */

import { Long } from "bson";
import { KnownChatType } from "../../chat/chat-type";
import { feedFromChat, OpenKickFeed, OpenRewriteFeed } from "../../chat/feed/chat-feed";
import { KnownFeedType } from "../../chat/feed/feed-type";
import { EventContext } from "../../event/event-context";
import { OpenChannelEvents, OpenChannelListEvents } from "../../event/events";
import { OpenChannelInfo } from "../../openlink/open-channel-info";
import { DefaultRes } from "../../packet/bson-data-codec";
import { LinkKickedRes } from "../../packet/chat/link-kicked";
import { SyncLinkPfRes } from "../../packet/chat/sync-link-pf";
import { SyncMemTRes } from "../../packet/chat/sync-mem-t";
import { ChannelInfoStruct } from "../../packet/struct/channel";
import { ChatlogStruct } from "../../packet/struct/chat";
import { structToChatlog } from "../../packet/struct/wrap/chat";
import { structToOpenLinkChannelUserInfo } from "../../packet/struct/wrap/user";
import { OpenChannelUserInfo } from "../../user/channel-user-info";
import { ChannelInfoUpdater, ChannelListUpdater } from "../channel/talk-channel-handler";
import { Managed } from "../managed";
import { TalkOpenChannel } from "./talk-open-channel";
import { TalkOpenChannelList } from "./talk-open-channel-list";

/**
 * Capture and handle pushes coming to open channel
 */
export class TalkOpenChannelHandler implements Managed<OpenChannelEvents> {

    constructor(private _channel: TalkOpenChannel, private _updater: ChannelInfoUpdater<OpenChannelInfo, OpenChannelUserInfo>) {

    }

    private _callEvent<U extends keyof OpenChannelEvents>(parentCtx: EventContext<OpenChannelEvents>, event: U, ...args: Parameters<OpenChannelEvents[U]>) {
        this._channel.emit(event, ...args);
        parentCtx.emit(event, ...args);
    }

    pushReceived(method: string, data: DefaultRes, parentCtx: EventContext<OpenChannelEvents>) {
        switch (method) {
            case 'SYNCMEMT': {
                const memTData = data as DefaultRes & SyncMemTRes;
                if (!this._channel.channelId.eq(memTData.c) && !this._channel.linkId.eq(memTData.li)) return;

                const len = memTData.mids.length;
                for (let i = 0; i < len; i++) {
                    const user = { userId: memTData.mids[i] };
                    const perm = memTData.mts[i];

                    if (!perm) continue;

                    const lastInfo = this._channel.getUserInfo(user);
                    this._updater.updateUserInfo(user, { perm });
                    const info = this._channel.getUserInfo(user);
                    if (lastInfo && info) {
                        this._callEvent(parentCtx, 'perm_changed', this._channel, lastInfo, info);
                    }
                }

                break;
            }

            case 'SYNCLINKPF': {
                const pfData = data as DefaultRes & SyncLinkPfRes;
                if (!this._channel.channelId.eq(pfData.c) && !this._channel.linkId.eq(pfData.li)) return;

                const updated = structToOpenLinkChannelUserInfo(pfData.olu);
                const last = this._channel.getUserInfo(updated);
                if (!last) break;

                this._updater.updateUserInfo(updated, updated);

                this._callEvent(
                    parentCtx,
                    'profile_changed',
                    this._channel,
                    last,
                    updated
                );
                break;
            }

            case 'SYNCREWR': {
                const struct = data['chatLog'] as ChatlogStruct;
                if (!this._channel.channelId.eq(struct.chatId)) break;

                const chatLog = structToChatlog(struct);
                if (chatLog.type !== KnownChatType.FEED) break;
                const feed = feedFromChat(chatLog);
                if (feed.feedType !== KnownFeedType.OPENLINK_REWRITE_FEED) break;

                this._callEvent(
                    parentCtx,
                    'message_hidden',
                    chatLog,
                    this._channel,
                    feed as OpenRewriteFeed
                )
                break;
            }

            case 'RELAYEVENT': {
                // TODO
                break;
            }

            default: break;
        }
    }

}

export class TalkOpenChannelListHandler implements Managed<OpenChannelListEvents> {

    constructor(private _list: TalkOpenChannelList, private _updater: ChannelListUpdater<TalkOpenChannel>) {

    }

    private _callEvent<U extends keyof OpenChannelListEvents>(parentCtx: EventContext<OpenChannelListEvents>, event: U, ...args: Parameters<OpenChannelListEvents[U]>) {
        this._list.emit(event, ...args);
        parentCtx.emit(event, ...args);
    }

    pushReceived(method: string, data: DefaultRes, parentCtx: EventContext<OpenChannelListEvents>) {
        switch (method) {

            case 'SYNCLINKCR': {
                const chatRoom: ChannelInfoStruct = data['chatRoom'];
                if (!chatRoom) break;
                
                this._updater.addChannel({ channelId: chatRoom.chatId }).then(channelRes => {
                    if (!channelRes.success) return;

                    this._callEvent(
                        parentCtx,
                        'channel_join',
                        channelRes.result
                    );
                });

                break;
            }

            case 'LINKKICKED': {
                const kickData = data as DefaultRes & LinkKickedRes;
                
                const kickedChannel = this._list.get(kickData.c);

                if (!kickedChannel) return;
                this._updater.removeChannel(kickedChannel);

                const chatLog = structToChatlog(kickData.chatLog);
                if (chatLog.type !== KnownChatType.FEED) return;
                const feed = feedFromChat(chatLog);
                if (feed.feedType !== KnownFeedType.OPENLINK_KICKED) return;

                this._callEvent(
                    parentCtx,
                    'channel_kicked',
                    chatLog,
                    kickedChannel,
                    feed as OpenKickFeed
                );

                break;
            }

            default: break;
        }
    }

}