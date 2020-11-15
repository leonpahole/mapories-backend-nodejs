import { IChatroom } from "../../db/models/chatroom.model";
import { UserExcerptDto } from "../user/authUser.dto";

export class ChatroomDto {
  id: string;
  name?: string;
  lastMessagedAt?: Date;
  participants: UserExcerptDto[];

  public static fromModel(chatroom: IChatroom): ChatroomDto {
    return {
      id: chatroom._id!.toString(),
      name: chatroom.name,
      lastMessagedAt: chatroom.lastMessagedAt,
      participants: UserExcerptDto.fromUserExtendedRefs(chatroom.participants),
    };
  }

  public static fromModels(chatrooms: IChatroom[]): ChatroomDto[] {
    return chatrooms.map((p) => this.fromModel(p));
  }
}
