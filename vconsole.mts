import * as net from "net";

/**
 * Connects to the VConsole.
 *
 * ```ts
    const vconsole = new VConsole2();
    vconsole.onPRNT = (event, content) => console.log(content.channel, content.message);
    await vconsole.connect();
    await vconsole.execute("echo Hello vconsole2.mts");
 * ```
 */
export class VConsole {
    private readonly socket: net.Socket;
    private readonly encoding: BufferEncoding = "ascii";
    private leftover_data: Buffer = Buffer.from([]);

    public constructor() {
        this.socket = new net.Socket();
        this.socket.on("data", (data: Buffer) => this.onData(data));
    }

    public connect(
        options: net.SocketConnectOpts = { host: "127.0.0.1", port: 29_000 },
        MAX_TRIES: number = 10,
        RETRY_DELAY: number = 1000,
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.socket.once("connect", () => resolve());
            this.socket.on("error", (err) => {
                if (++tries >= MAX_TRIES) {
                    reject(err);
                    return;
                }
                setTimeout(() => this.socket.connect(options), RETRY_DELAY);
            });

            let tries = 0;
            this.socket.connect(options);
        });
    }

    public execute(command: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.socket.write(this.encodeChunk(command), (err) => {
                if (!err) resolve();
                else reject(err);
            });
        });
    }

    public disconnect(): Promise<void> {
        return new Promise((resolve) => {
            this.socket.on("close", resolve);
            this.socket.destroy();
        });
    }

    public onPRNT(event: Chunk, content: PRNTContent): void {}
    public onAINF(event: Chunk): void {}
    public onADON(event: Chunk) {}
    public onCHAN(event: Chunk) {}
    public onCVRB(event: Chunk) {}
    public onEFUL(event: Chunk) {}
    public onUNKOWN(event: Chunk) {
        console.log(event.content.toString());
    }

    private onData(data: Buffer): void {
        data = Buffer.concat([this.leftover_data, data]);
        while (data.length >= 12) {
            const event = this.decodeChunk(data);
            if (!event) break;
            if (event.type == "PRNT") {
                this.onPRNT(event, this.decodePRNTContent(event.content));
            } else if (event.type == "AINF") {
                this.onAINF(event);
            } else if (event.type == "ADON") {
                this.onADON(event);
            } else if (event.type == "CHAN") {
                this.onCHAN(event);
            } else {
                this.onUNKOWN(event);
            }
            data = data.subarray(event.length);
        }
        this.leftover_data = data;
    }

    private encodeChunk(command: string): Buffer {
        const chunk = Buffer.concat([
            // Header
            Buffer.from("CMND", this.encoding), // Type
            Buffer.from([0, 212]), // Protocol
            Buffer.alloc(4), // Length
            Buffer.from([0x00, 0x00]), // Unknown
            // Content
            Buffer.from(command, this.encoding),
            Buffer.from([0x00]), // Null Terminator
        ]);
        chunk.writeUInt32BE(chunk.byteLength, 6);
        return chunk;
    }

    private decodeChunk(data: Buffer): Chunk | undefined {
        const length = data.readUInt32BE(6);
        const chunk: Chunk = {
            // Header
            type: data.toString(this.encoding, 0, 4),
            protocol: data.readUInt16BE(4),
            length: length,
            unkown: data.subarray(10, 12),
            // Content
            content: data.subarray(12, length),
        };
        if (data.length < chunk.length) return undefined;
        return chunk;
    }

    private decodePRNTContent(content: Buffer): PRNTContent {
        return {
            channel: content.readUInt32BE(0),
            logging_channel: content.readUInt32BE(4),
            verbosity: content.readUInt32BE(8),
            color: content.readUInt32BE(12),
            time: content.readUInt32BE(16),
            unkown_1: content.readUInt32BE(20),
            unknown_2: content.readUInt32BE(24),
            message: content.toString(this.encoding, 28, content.length - 2), // -2 = newline & null
        };
    }
}

export interface Chunk {
    type: string;
    protocol: number;
    length: number;
    unkown: Buffer;
    content: Buffer;
}

export interface PRNTContent {
    channel: number;
    logging_channel: number;
    verbosity: number;
    color: number;
    time: number;
    unkown_1: number;
    unknown_2: number;
    message: string;
}
