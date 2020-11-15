import { Request } from "express";
import { Socket } from "socket.io";
import { UserExcerptDto } from "../dto/user/authUser.dto";

export type ISocket = Socket & {
  localData: { user: UserExcerptDto };
};

export type SocketMessage = {
  namespace: string;
  room: string;
  topic: string;
  payload: any;
};
