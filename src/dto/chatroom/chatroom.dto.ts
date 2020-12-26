import { Types } from "mongoose";
import { IChatroom } from "../../db/models/chatroom.model";
import { UserExcerptDto } from "../user/authUser.dto";

export type ChatroomParticipantDto = UserExcerptDto & {
  isOnline: boolean;
  isTyping: boolean;
  isUnread: boolean;
};

export class ChatroomDto {
  id: string;
  name: string;
  participants: ChatroomParticipantDto[];
  isUnread: boolean;

  public static fromModel(
    chatroom: IChatroom,
    currentUserId: string
  ): ChatroomDto {
    let name = chatroom.name;
    if (!name) {
      if (chatroom.participants.length === 2) {
        name = chatroom.participants.find(
          (c) => c.userId.toString() !== currentUserId
        )!.name;
      } else {
        name = chatroom.participants.map((p) => p.name).join(", ");
      }
    }

    const participants: ChatroomParticipantDto[] = UserExcerptDto.fromUserExtendedRefs(
      chatroom.participants
    ).map((u) => {
      return {
        ...u,
        isOnline: false,
        isTyping: false,
        isUnread: chatroom.read.some(
          (cu) => (cu as Types.ObjectId).toString() === u.id
        ),
      };
    });

    return {
      id: chatroom._id!.toString(),
      name,
      participants,
      isUnread: chatroom.read.some(
        (u) => (u as Types.ObjectId).toString() === currentUserId
      ),
    };
  }

  public static fromModels(
    chatrooms: IChatroom[],
    chatroomId: string
  ): ChatroomDto[] {
    return chatrooms.map((p) => this.fromModel(p, chatroomId));
  }
}
