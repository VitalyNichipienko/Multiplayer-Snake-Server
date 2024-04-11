import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Vector2Float extends Schema{
    @type("number")x = Math.floor(Math.random() * 128) -64;
    @type("number") z = Math.floor(Math.random() * 128) -64;
}

export class Player extends Schema {
    @type("number") x = Math.floor(Math.random() * 128) -64;
    @type("number") z = Math.floor(Math.random() * 128) -64;
    @type("uint8") detailCount = 2; 
    @type("uint8") skinIndex = 0;
}

export class State extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();    
    @type([Vector2Float]) apples = new ArraySchema<Vector2Float>();

    colorIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

    createApple(){
        this.apples.push(new Vector2Float());
    }

    createPlayer(sessionId: string) {
        let player = new Player();
        let colorIndex = this.getRandomColorIndexAndRemove();

        player.skinIndex = colorIndex;
        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer (sessionId: string, movement: any) {
        this.players.get(sessionId).x = movement.x;
        this.players.get(sessionId).z = movement.z;
    }
    
    private getRandomColorIndexAndRemove(): number {
        const randomIndex = Math.floor(Math.random() * this.colorIndices.length);
        return this.colorIndices.splice(randomIndex, 1)[0];
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 4;
    startAppleCount = 100;

    onCreate (options) {
        console.log("StateHandlerRoom created!", options);

        this.setState(new State());

        this.onMessage("move", (client, data) => {
            this.state.movePlayer(client.sessionId, data);
        });

        for (let i = 0; i < this.startAppleCount; i++)
        {
            this.state.createApple();
        }
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin (client: Client) {
        this.state.createPlayer(client.sessionId);        
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }
}
