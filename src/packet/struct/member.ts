/*
 * Created on Sat Jan 23 2021
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */

import { Long } from "bson";
import { OpenChatUserPerm } from "../../openlink/open-link-type";
import { UserType } from "../../user/user-type";

/**
 * Member struct for normal channel
 */
export interface NormalMemberStruct {

    /**
     * User id
     */
    userId: Long;

    /**
     * Account id
     */
    accountId: number;

    /**
     * Nickname
     */
    nickName: string;

    /**
     * User country iso
     */
    countryIso: string;

    profileImageUrl: string;
    fullProfileImageUrl: string;
    originalProfileImageUrl: string;

    /**
     * Profile status message
     */
    statusMessage: string;
    
    /**
     * Linked kakao services. (ex: story)
     */
    linkedServices: string;

    /**
     * User type
     */
    type: UserType;

    /**
     * Account status
     */
    suspended: boolean;

    /**
     * User type(?) Unknown
     */
    ut: number;

}

/**
 * Member struct for open channel
 */
export interface OpenMemberStruct {

    userId: Long;

    /**
     * User type always 1000 for open chat member.
     */
    type: UserType;

    /**
     * Nickname
     */
    nickName: string;

    /**
     * Profile image url
     */
    pi: string;

    /**
     * Full profile image url
     */
    fpi: string;

    /**
     * Original profile image url
     */
    opi: string;

    /**
     * open token
     */
    opt: number;

    /**
     * Only presetns if user is using open profile.
     */
    pli?: Long;

    /**
     * Open chat user permission
     */
    mt: OpenChatUserPerm;    

}