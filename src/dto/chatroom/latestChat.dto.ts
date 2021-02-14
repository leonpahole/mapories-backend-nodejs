import { UserExcerptDto } from "../user/authUser.dto";
import { ChatroomMessageDto } from "./chatroomMessage.dto";

export class LatestChatDto {
  chatroomId: string;
  lastMessage: ChatroomMessageDto | null;
  otherUsers: UserExcerptDto[];
}
