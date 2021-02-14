import { IsDefined, MinLength } from "class-validator";
import { inject } from "inversify";
import {
  controller,
  httpPost,
  interfaces,
  request,
  requestBody,
  httpGet,
  requestParam,
  queryParam,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { isAuth, validation } from "../middlewares";
import { IRequest } from "../types/api";
import { ChatService } from "../services/chat.service";
import { ChatroomDto } from "../dto/chatroom/chatroom.dto";
import { ChatroomMessageDto } from "../dto/chatroom/chatroomMessage.dto";
import { CursorPaginatedResponse } from "../dto/PaginatedResponse";
import { LatestChatDto } from "../dto/chatroom/latestChat.dto";

export class CreateChatroomRequest {
  @IsDefined()
  @MinLength(1)
  participants!: string[];
}

@controller("/chat")
export class ChatController implements interfaces.Controller {
  constructor(@inject(TYPES.ChatService) private chatService: ChatService) {}

  @httpGet("/rooms", isAuth)
  public getUsersChatrooms(@request() req: IRequest): Promise<ChatroomDto[]> {
    return this.chatService.getUsersChatrooms(req.userId);
  }

  @httpGet("/latest-chats", isAuth)
  public getLatestChats(@request() req: IRequest): Promise<LatestChatDto[]> {
    return this.chatService.getLatestChats(req.userId);
  }

  @httpGet("/:id", isAuth)
  public getChatroomInfo(
    @request() req: IRequest,
    @requestParam("id") id: string
  ): Promise<ChatroomDto> {
    return this.chatService.getChatroomInfo(req.userId, id);
  }

  @httpGet("/rooms/:id/messages", isAuth)
  public getChatroomMessages(
    @request() req: IRequest,
    @requestParam("id") id: string,
    @queryParam("cursor") cursor?: number,
    @queryParam("pageSize") pageSize?: number
  ): Promise<CursorPaginatedResponse<ChatroomMessageDto>> {
    return this.chatService.getChatroomMessages(
      id,
      req.userId,
      cursor,
      Number(pageSize)
    );
  }

  @httpPost("/", isAuth, validation(CreateChatroomRequest))
  public createChatroom(
    @request() req: IRequest,
    @requestBody() body: CreateChatroomRequest
  ): Promise<ChatroomDto> {
    return this.chatService.createChatroom(req.userId, body);
  }
}
