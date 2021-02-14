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
import { CursorPaginatedResponse } from "../dto/PaginatedResponse";
import { LatestChatDto } from "../dto/chatroom/latestChat.dto";

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

    return ChatroomDto.fromModels(chatrooms, currentUserId);
  }

  async getChatroomInfo(
    currentUserId: string,
    id: string
  ): Promise<ChatroomDto> {
    const chatroom = await Chatroom.findOne({
      _id: id,
      "participants.userId": Types.ObjectId(currentUserId),
    }).exec();

    if (!chatroom) {
      throw CommonError.NOT_FOUND;
    }

    return ChatroomDto.fromModel(chatroom, currentUserId);
  }

  async getLatestChats(currentUserId: string): Promise<LatestChatDto[]> {
    const latestChats = await Chatroom.aggregate([
      {
        $match: {
          participants: {
            $elemMatch: { userId: Types.ObjectId(currentUserId) },
          },
        },
      },
      { $project: { id: 1, participants: 1 } },
      {
        $lookup: {
          from: "ichatroommessages",
          localField: "_id",
          foreignField: "chatroomId",
          as: "messages",
        },
      },
      { $unwind: { path: "$messages", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$messages.messages",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { "messages.messages.createdAt": -1 } },
      {
        $group: {
          _id: "$_id",
          lastMessage: { $first: "$messages" },
          participants: { $first: "$participants" },
        },
      },
      {
        $project: {
          chatroomId: "$lastMessage.chatroomId",
          lastMessage: "$lastMessage.messages",
          otherUsers: {
            $filter: {
              input: "$participants",
              as: "p",
              cond: {
                $ne: ["$$p.userId", Types.ObjectId(currentUserId)],
              },
            },
          },
        },
      },
    ]);

    return latestChats.map((c) => ({
      chatroomId: c._id.toString(),
      lastMessage: c.lastMessage
        ? {
            content: c.lastMessage.content,
            createdAt: c.lastMessage.createdAt,
            id: c.lastMessage._id,
            sender: {
              id: c.lastMessage.author.userId,
              name: c.lastMessage.author.name,
            },
          }
        : null,
      otherUsers: c.otherUsers.map((u: any) => ({
        id: u.userId,
        name: u.name,
      })),
    }));
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

  async isUserParticipantInChatroom(
    chatroomId: string,
    participantId: string
  ): Promise<boolean> {
    const c = await Chatroom.findOne({
      _id: chatroomId,
      "participants.userId": Types.ObjectId(participantId),
    }).exec();

    return c != null;
  }

  async getChatroomMessages(
    id: string,
    currentUserId: string,
    cursor?: number,
    pageSize: number = CHATS_DEFAULT_PAGE_SIZE
  ): Promise<CursorPaginatedResponse<ChatroomMessageDto>> {
    const chatroom = await this.getChatroomByIdAndParticipantId(
      id,
      currentUserId
    );

    if (!chatroom) {
      throw CommonError.NOT_FOUND;
    }

    const chatList = await ChatroomMessages.aggregate([
      {
        $match: {
          chatroomId: Types.ObjectId(id),
        },
      },
      { $unwind: { path: "$messages", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "messages.createdAt": {
            $lte: cursor ? new Date(Number(cursor)) : new Date(),
          },
        },
      },
      { $sort: { "messages.createdAt": -1 } },
      { $limit: pageSize + 1 },
      { $sort: { "messages.createdAt": 1 } },
    ]).exec();

    if (!chatList) {
      return new CursorPaginatedResponse<ChatroomMessageDto>([], null);
    }

    const chats: IChatroomMessage[] = chatList
      .map((cl: any) => cl.messages)
      .reverse();
    let nextCursor: number | null = null;
    if (chats.length > pageSize) {
      nextCursor = chats.pop()!.createdAt!.getTime();
    }

    const chatDtos = ChatroomMessageDto.fromModels(chats);
    return new CursorPaginatedResponse<ChatroomMessageDto>(
      chatDtos,
      nextCursor
    );
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
      return ChatroomDto.fromModel(existingChatroom, currentUserId);
    }

    const chatroom = await Chatroom.create({
      participants,
      read: [],
    });

    return ChatroomDto.fromModel(chatroom, currentUserId);
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
  ): Promise<string[] | null> {
    const chatroom = await this.getChatroomByIdAndParticipantId(
      chatroomId,
      userId
    );

    if (!chatroom) {
      return null;
    }

    const author = await this.userUtilsService.userIdToUserExtendedRef(userId);
    if (!author) {
      return null;
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

    await Chatroom.updateOne(
      { _id: stringToObjectId(chatroomId) },
      { read: [Types.ObjectId(userId)] }
    );

    return chatroom.participants
      .filter((p) => p.userId.toString() !== userId)
      .map((p) => p.userId.toString());
  }

  async readChatroom(chatroomId: string, userId: string): Promise<boolean> {
    const chatroom = await this.getChatroomByIdAndParticipantId(
      chatroomId,
      userId
    );

    if (!chatroom) {
      return false;
    }

    await Chatroom.updateOne(
      { _id: stringToObjectId(chatroomId) },
      { $push: { read: Types.ObjectId(userId) } }
    );

    return true;
  }
}
