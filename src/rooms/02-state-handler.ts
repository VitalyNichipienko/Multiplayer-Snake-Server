import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Vector2Float extends Schema {
    @type("uint32") id = 0;
    @type("number") x = Math.floor(Math.random() * 128) - 64;
    @type("number") z = Math.floor(Math.random() * 128) - 64;
}

export class Player extends Schema {
    @type("number") x = Math.floor(Math.random() * 128) - 64;
    @type("number") z = Math.floor(Math.random() * 128) - 64;
    @type("uint8") detailCount = 0;
    @type("uint8") skinIndex = 0;
    @type("uint16") score = 0;
}

export class State extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type([Vector2Float]) apples = new ArraySchema<Vector2Float>();

    appleLastId = 0;

    colorIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7];
    gameOverIDs = [];

    createApple() {
        const apple = new Vector2Float();
        apple.id = this.appleLastId;
        this.apples.push(apple);
        this.appleLastId++;
    }

    collectApple(player: Player, data: any) {
        const apple = this.apples.find((value) => value.id === data.id);

        if (apple === undefined)
            return;

        apple.x = Math.floor(Math.random() * 128) - 64;
        apple.z = Math.floor(Math.random() * 128) - 64;

        player.score++;
        player.detailCount = Math.round(player.score / 3);
    }

    createPlayer(sessionId: string) {
        let player = new Player();
        let colorIndex = this.getRandomColorIndexAndRemove();

        player.skinIndex = colorIndex;
        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        if (this.players.has(sessionId))
            this.players.delete(sessionId);
    }

    movePlayer(sessionId: string, movement: any) {
        this.players.get(sessionId).x = movement.x;
        this.players.get(sessionId).z = movement.z;
    }

    gameOver(data) {
        const detailsPositions = JSON.parse(data);
        const clientID = detailsPositions.id;
        const gameOverID = this.gameOverIDs.find((value) => value === clientID);

        if (gameOverID !== undefined)
            return;

        this.gameOverIDs.push(clientID);
        this.delayClearGameOverIDs(clientID);
        this.removePlayer(clientID);

        for (let i = 0; i < detailsPositions.dPos.length; i++) {
            const apple = new Vector2Float();
            apple.id = this.appleLastId++;
            apple.x = detailsPositions.dPos[i].x;
            apple.z = detailsPositions.dPos[i].z;
            this.apples.push(apple);
        }
    }

    private async delayClearGameOverIDs(clientID) {
        await new Promise(resolve => setTimeout(resolve, 10000));

        const index = this.gameOverIDs.findIndex((value) => value === clientID)

        if (index <= -1)
            return;

        this.gameOverIDs.splice(index, 1);
    }

    private getRandomColorIndexAndRemove(): number {
        const randomIndex = Math.floor(Math.random() * this.colorIndices.length);
        return this.colorIndices.splice(randomIndex, 1)[0];
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 4;
    startAppleCount = 100;

    onCreate(options) {
        console.log("StateHandlerRoom created!", options);

        this.setState(new State());

        this.onMessage("move", (client, data) => {
            this.state.movePlayer(client.sessionId, data);
        });

        this.onMessage("collect", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            this.state.collectApple(player, data);
        });

        this.onMessage("gameOver", (client, data) => {
            this.state.gameOver(data);
        });

        for (let i = 0; i < this.startAppleCount; i++) {
            this.state.createApple();
        }
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin(client: Client) {
        this.state.createPlayer(client.sessionId);
    }

    onLeave(client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose() {
        console.log("Dispose StateHandlerRoom");
    }
}
