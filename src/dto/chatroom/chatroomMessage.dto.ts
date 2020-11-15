import { UserExcerptDto } from "../user/authUser.dto";
import { IChatroomMessage } from "../../db/models/chatroomMessages.model";

export class ChatroomMessageDto {
  id: string;
  createdAt: Date;
  sender: UserExcerptDto;
  content: string;

  public static fromModel(
    chatroomMessage: IChatroomMessage
  ): ChatroomMessageDto {
    return {
      id: chatroomMessage._id!.toString(),
      createdAt: chatroomMessage.createdAt!,
      sender: UserExcerptDto.fromUserExtendedRef(chatroomMessage.author),
      content: chatroomMessage.content,
    };
  }

  public static fromModels(
    chatroomMessages: IChatroomMessage[]
  ): ChatroomMessageDto[] {
    return chatroomMessages.map((c) => this.fromModel(c));
  }
}
