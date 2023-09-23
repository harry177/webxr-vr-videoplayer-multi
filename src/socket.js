import { io } from "socket.io-client";

export const socket = io({ reconnectionAttempts: 10000, timeout: 2000 });
