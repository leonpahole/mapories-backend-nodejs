import { injectable, inject } from "inversify";
import Chatroom, { IChatroom } from "../db/models/chatroom.model";
import { ChatroomDto } from "../dto/chatroom/chatroom.dto";
import { CreateChatroomRequest } from "../controllers/chat.controller";
import { Types } from "mongoose";
import TYPES from "../config/types";
import { UserUtilsService } from "./userUtils.service";
import { CommonError } from "../errors/common.error";
import { ChatroomMessageDto } from "../dto/chatroom/chatroomMessage.dto";
import ChatroomMessages, {
  IChatroomMessage,
} from "../db/models/chatroomMessages.model";
import { stringToObjectId } from "../utils/strToObjectId";
import { PaginatedResponse } from "../dto/PaginatedResponse";

const CHATS_DEFAULT_PAGE_SIZE = 10;

@injectable()
export class ChatService {
  constructor(
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService
  ) {}

  async getUsersChatrooms(currentUserId: string): Promise<ChatroomDto[]> {
    const chatrooms = await Chatroom.find({
      "participants.userId": Types.ObjectId(currentUserId),
    })
      .sort({ lastMessagedAt: -1 })
      .exec();

    return ChatroomDto.fromModels(chatrooms);
  }

  async getUsersChatroomIds(currentUserId: string): Promise<IChatroom[]> {
    const chatrooms = await Chatroom.find({
      "participants.userId": Types.ObjectId(currentUserId),
    })
      .select({ _id: 1, participants: 1 })
      .exec();

    return chatrooms;
  }

  private async getChatroomByIdAndParticipantId(
    chatroomId: string,
    participantId: string
  ): Promise<IChatroom | null> {
    return await Chatroom.findOne({
      _id: chatroomId,
      "participants.userId": Types.ObjectId(participantId),
    }).exec();
  }

  async getChatroomMessages(
    id: string,
    currentUserId: string,
    skip: number,
    pageSize: number = CHATS_DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<ChatroomMessageDto>> {
    const chatroom = await this.getChatroomByIdAndParticipantId(
      id,
      currentUserId
    );

    if (!chatroom) {
      throw CommonError.NOT_FOUND;
    }

    const chatList = await ChatroomMessages.aggregate([
      { $match: { chatroomId: Types.ObjectId(id) } },
      { $unwind: "$messages" },
      { $sort: { "messages.createdAt": -1 } },
      { $skip: skip },
      { $limit: pageSize + 1 },
      { $sort: { "messages.createdAt": 1 } },
    ]).exec();

    if (!chatList) {
      return new PaginatedResponse<ChatroomMessageDto>([], false);
    }

    const chats: IChatroomMessage[] = chatList.map((cl: any) => cl.messages);

    const moreAvailable = chats.length > pageSize;
    if (moreAvailable) {
      chats.shift();
    }

    const chatDtos = ChatroomMessageDto.fromModels(chats);
    return new PaginatedResponse<ChatroomMessageDto>(chatDtos, moreAvailable);
  }

  async createChatroom(
    currentUserId: string,
    body: CreateChatroomRequest
  ): Promise<ChatroomDto> {
    const participants = await this.userUtilsService.userIdsToUserExtendedRefs([
      currentUserId,
      ...body.participants,
    ]);

    const fullParticipants = participants.map((p) =>
      Types.ObjectId(p.userId.toString())
    );

    const existingChatroom = await this.findChatroomByParticipantIds(
      fullParticipants
    );

    if (existingChatroom) {
      return ChatroomDto.fromModel(existingChatroom);
    }

    const chatroom = await Chatroom.create({
      participants,
    });

    return ChatroomDto.fromModel(chatroom);
  }

  private async findChatroomByParticipantIds(
    ids: Types.ObjectId[]
  ): Promise<IChatroom | null> {
    return await Chatroom.findOne({
      "participants.userId": { $all: ids },
      participants: { $size: ids.length },
    }).exec();
  }

  async createMessage(
    chatroomId: string,
    message: string,
    userId: string
  ): Promise<boolean> {
    const chatroom = await this.getChatroomByIdAndParticipantId(
      chatroomId,
      userId
    );

    if (!chatroom) {
      return false;
    }

    const author = await this.userUtilsService.userIdToUserExtendedRef(userId);
    if (!author) {
      return false;
    }

    const messageObj: IChatroomMessage = {
      author: author,
      content: message,
    };

    await ChatroomMessages.updateOne(
      { chatroomId: stringToObjectId(chatroomId) },
      { $push: { messages: messageObj } },
      {
        upsert: true,
      }
    );

    return true;
  }
}
