import { injectable } from "inversify";
import { container } from "../../config/container";
import { InversifySocketServer } from "inversify-socket-utils";
import { ISocket } from "../../types/socket";
import { Server } from "socket.io";

@injectable()
export class SocketService {
  constructor() {}

  private server(): Server {
    return container.get<InversifySocketServer>("InversifySocketServer").server;
  }

  private allSockets(namespace: string): ISocket[] {
    return Array.from(
      this.server().of(namespace).sockets.values()
    ) as ISocket[];
  }

  private findSocketByUserId(
    namespace: string,
    userId: string
  ): ISocket | undefined {
    return this.allSockets(namespace).find(
      (s) => s.localData.user.id === userId
    );
  }

  findOnlineUserIds(namespace: string, userIds: string[]) {
    const allSockets = this.allSockets(namespace);
    return userIds.filter((i) =>
      allSockets.some((s) => s.localData.user.id === i)
    );
  }

  joinARoom(namespace: string, userId: string, room: string): void {
    const socket = this.findSocketByUserId(namespace, userId);
    if (socket) {
      socket.join(room);
    }
  }

  joinARoomMany(namespace: string, userIds: string[], room: string): void {
    userIds.forEach((u) => {
      this.joinARoom(namespace, u, room);
    });
  }

  leaveARoom(namespace: string, userId: string, room: string): void {
    const socket = this.findSocketByUserId(namespace, userId);
    if (socket) {
      socket.leave(room);
    }
  }

  leaveARoomMany(namespace: string, userIds: string[], room: string): void {
    userIds.forEach((u) => {
      this.leaveARoom(namespace, u, room);
    });
  }

  emit(namespace: string, topic: string, room: string, payload: any) {
    this.server().of(namespace).to(room).emit(topic, payload);
  }
}
