"use strict";

var Utils = require('./helpers/utils.js');
var Field = require('./field.js');
var CollisionAverage = require('./physics/collision.js');
var WeaponManager = require('./weapons/weapon.manager.js');


var DEBUG = false;

/*function Slot(wopw, gameId, mapName, playerCount, gameDuration, turnDuration){

}*/


class Slot{
    constructor(wopw, gameId, mapName, playerCount, gameDuration, turnDuration){
        this.WOPW           = wopw;
        this.gameId         = gameId;

        this.mapName        = mapName;
        this.playerCount    = playerCount;
        this.gameDuration   = gameDuration;
        this.turnDuration   = turnDuration;

        this.initialize();
    }

    initialize(){
        this.currentPlayer = -1;

        this.deaths = [];

        this.initialCount = 0;
        this.randomSeed = 0;

        this.startingTime = 0;
        this.tick         = 0;
        this.turnEndTick  = 0;

        this.clients        = {};
        this.status         = "idle";
        this.min            = this.playerCount;
        this.skip           = [];
        this.time           = "";
        this.cl             = 0;
        this.sumOfLevels    = 0;
        this.session        = "undefined";
        this.deadPlayers = [];
        this.initialCount = 0;

        this.weapon = new WeaponManager(this);
        this.field = new Field(this);

        this.commands = [];
        this.physicsObjects = [];

        this.lastSynchCheck = {"command": "synch_check", "synchCheck" : ""};

        this.completedTurns = 0;

        this.synchCmd = null;
        this.startingTimeout = null
    }

    getCollisionAverage(obj, pointSet, checkNonAvatar, checkAvatar, checkField, checkWalls) {

        var avg = new CollisionAverage();
        for(var j = 0; j < pointSet.length; j++){
            var fieldX = obj.X + pointSet[j].X;
            var fieldY = obj.Y + pointSet[j].Y;

            for (var i = 0; i < this.physicsObjects.length; i++) {
                if(this.physicsObjects[i].type == "avatar" && !checkAvatar) continue;
                if((this.physicsObjects[i].type == "crate" || this.physicsObjects[i].type == "mine") && !checkNonAvatar) continue;
                if(!this.physicsObjects[i].complete && this.physicsObjects[i] != obj){
                    if(this.physicsObjects[i].checkCollision(fieldX, fieldY)){
                        avg.sumX += pointSet[j].X;
                        avg.sumY += pointSet[j].Y;
                        avg.nP++;
                    }
                }
            }
        }

        if(checkWalls){
            for(var j = 0; j < pointSet.length; j++){
                var fieldX = obj.X + pointSet[j].X;

                if(fieldX < 0 || fieldX > this.field.width){
                    avg.sumX += pointSet[j].X;
                    avg.sumY += pointSet[j].Y;
                    avg.nP++;
                    avg.nWall++;
                }
            }
        }

        if(checkField){
            avg = this.field.checkCollisionPointSet(obj.X, obj.Y, pointSet, avg);
        }

        if (avg.nP != 0){
            avg.sumX = (avg.sumX / avg.nP);
            avg.sumY = (avg.sumY / avg.nP);
        }

        return avg;
    }


    update(){
        this.checkGame();

        if(this.isRunning()){
            this.tick += 10;

            if(this.tick % 50 == 0){
                if(DEBUG)
                    console.log(">> Game Tick: " + this.tick);
                this.sendTick();
            }

            if(parseInt(this.lastSynchCheck.date) + 20 < new Date().now){
                console.log("haven't received tick in 20ms");
            }

            //step avatar
            for(var i = 0; i < this.physicsObjects.length; i++){
                if(this.physicsObjects[i].complete){
                    this.physicsObjects.splice(i, 1);
                }else{
                    //this.physicsObjects[i].step();
                    //this.physicsObjects[i].move();
                }
            }
        }
    }

    //### update methods ###

    checkIfTurnIsOver(){
        if(this.turnEndTick > 0 && this.turnEndTick <= this.tick) {
            if(DEBUG)
                console.log(">> Changing turn");
            this.setNextTurn(100);
            this.sendChangeTurn();
        }
    }

    checkGame(){
        if(!this.isRunning()){
            var len = Object.keys(this.clients).length;

            if(len >= 2 && !this.startingTimeout){
                //everybody is ready, there are at least 2 players and the game hasn't been set to 'starting'
                console.log(">> Starting game in 5 seconds");
                this.updateGameStatus("starting");
                this.refresh();
                this.startingTimeout = setTimeout(function(){
                	this.refresh();
                    console.log(">> Time is up. Starting game");
                    this.startingTime = 0;
                    this.sendConfirmation();
                    this.startGame();
                    //handle timeout
                    clearTimeout(this.startingTimeout);
                    this.startingTimeout = null;
                }.bind(this), 5000);
            }else if(len < 2){
                //it might be starting, but if there are not enough players (some might exit) or if
                // some new players hop in and they're not "ready", the game should stop.

                if(this.status == "idle") return; //it's already been idled
                console.log(">> New game status: Idle");
                this.updateGameStatus("idle");
                //handle timeout
                if(this.startingTimeout){
                	console.log("clearing timeout!");
                	clearTimeout(this.startingTimeout);
                	this.startingTimeout = null;
                }
                //refresh
                this.refresh();
            }
        }else{
            this.checkIfTurnIsOver();
            //if only one player remains in game
            //send game over
            if(Object.keys(this.clients).length <= 1){
                this.endGame();
                return;
            }

            if(this.countPlayersAlive() <= 1){
                this.endGame();
                return;
            }

            //what if the current player exits?
            if(!this.clients[this.currentPlayer]){
                this.sendChangeTurn();
            }
        }
    }

    stopGameStart(){
        console.log("stopping game!");
        clearTimeout(this.startingTimeout);
        this.startingTimeout = null;
        this.updateGameStatus("idle");
        this.refresh();
    }

    generateRndSeed(){
        this.randomSeed = Utils.randInt();
    }

    setNextTurn(delay){
        this.turnEndTick = this.tick + (this.turnDuration / 10) + delay;
    }

    setNextTurnFN(delay){
        var newTurnEndTick = this.tick + delay;
        this.turnEndTick = (newTurnEndTick > this.turnEndTick) ? this.turnEndTick : newTurnEndTick;
    }

    updatePlayerStatus(id, status) {
        for(var key in this.clients)
            if(this.clients[key].player.id == id){
                this.clients[key].player.status = status;
                break;
            }
        this.refresh();
    }

    updateGameStatus(status){
        this.status = status;
    }

    setPlayerDead(id){
        if(this.clients[id]){
            this.clients[id].avatar.dead = true;
            this.deadPlayers.push(id);
        }else{
            //its been removed from the clients array
        }
    }

    setDefaultPositions(){
        var positionIndex = 0;
        for(var key in this.clients){
        	if(!this.clients[key] || !this.clients[key].avatar){
        		delete this.clients[key];
        		continue;
        	}
            this.clients[key].avatar.X = this.WOPW.mapsObj[this.mapName].positions[positionIndex][0];
            this.clients[key].avatar.Y = this.WOPW.mapsObj[this.mapName].positions[positionIndex][1];

            positionIndex++;
        }
    }

    getPlayerPositions(){
        var positions = [];

        for(var key in this.clients){
            positions.push(
            {
                id: this.clients[key].player.id,
                 x: this.clients[key].avatar.X,
                 y: this.clients[key].avatar.Y
            });
        }

        return positions;
    }
    
    getPlayerPositionsAndVelocities(){
        var collection = [];

        for(var key in this.clients){
            collection.push([
                    this.clients[key].player.id,
                    this.clients[key].avatar.X,
                    this.clients[key].avatar.Y,
                    this.clients[key].avatar.Vx,
                    this.clients[key].avatar.Vy
                ]
            );
        }

        return collection;
    }

    getRemainingTicks(){
        return (this.turnEndTick - this.tick);
    }

    //### weps ###

    addProjectile(properties, x, y, vx, vy){
        console.log("adding projectile! " + x + " " + y + " " + vx + " " + vy);
        this.physicsObjects.push(this.weapon.makeWeapon(properties, x, y, vx, vy));
    }

    //### player container helpers ###

    addClient(client){
        this.clients[client.player.id] = client;
        if(client.avatar != null){
            console.log(">> client avatar is not null. adding to physicsObjects");
            this.physicsObjects.push(client.avatar);
        }
        else console.log("!! client avatar is null");

        if (this.currentPlayer == -1)
            this.currentPlayer = client.player.id;
        else if(client.player.id < this.currentPlayer){
            this.currentPlayer = client.player.id;
        }
    }

    removeClient(client){
        //change status from dead to disconnected
        if(DEBUG) console.log(">> checking if player was dead");
        var deadPlayerIndex = this.deadPlayers.indexOf(client.player.id);
        if(deadPlayerIndex >= 0){
            this.deadPlayers.splice(deadPlayerIndex, 1);
        }

        delete this.clients[client.player.id];

        if(this.isStarting())
            this.stopGameStart();
        else this.refresh();

        this.checkGame();
    }

    containsClient(client){
        return this.clients[client.player.id] != null;
    }

    //### packets ###

    sendPacket(packet){
        for(var key in this.clients){
            var client = this.clients[key];

            if(client){
                if(packet.hasOwnProperty("session"))
                    packet.session = client.gameSession;
                 client.sendPacket(packet);
            }
        }
    }

    sendPacketE(packet, clientExcl){
        for(var key in this.clients){
            var client = this.clients[key];

            if(client && client != clientExcl){
                if(packet.hasOwnProperty("session"))
                    packet.session = client.gameSession;
                 client.sendPacket(packet);
            }
        }
    }

    startGame(){
        //updating the game status is the first thing to do
        //you don't want any 'intruders'

        this.updateGameStatus("running");
        this.generateRndSeed();
        this.setDefaultPositions();

        var cmd = {
            "command" 		: "startGame",
            "randomSeed"	: this.randomSeed,
            "co"			: this.getPlayerIds(),
            "currentPlayer" : this.getCurrentPlayer(),
            "tick"			: this.getTick(),
            "playerlist"	: this.getPlayerList(),
            "positions"     : this.getPlayerPositions()
        };

        this.initialCount = cmd.co.length;

        this.sendPacket(cmd);
        this.setNextTurn(200);
    }

    isFull(){
        return (this.playerCount == this.getPlayerCount());
    }

    refresh(){
        this.sendPacket(this.getString("game"));
    }

    sendConfirmation(){
        this.sendPacket({"command" : "game_join_confirmed"});
    }

    sendChangeTurn(){
        try{
            //what if only one player remains in game?
            if(Object.keys(this.clients).length == 1){
                this.endGame();
                return;
            }

            if(this.clients[this.currentPlayer]){
                this.clients[this.currentPlayer].avatar.stopWalking();
            }

            //this.synchronize();
            var r = this.getNextPlayerId();

            this.clients[this.currentPlayer].sendServerTick(this.tick, this.turnEndTick);
            this.clients[this.currentPlayer].resetTurnChanges();
            var record = this.getGameRecord("changeTurn");

            this.sendPacket(record);

        }
        catch(e){

        }
    }

    synchronize(){
        for(var key in this.clients){
            var c = this.clients[key];
            this.sendPlayerPosition(c);
        }
    }

    sendTick(){
        var cmd = this.lastSynchCheck;
        cmd["command"] = "synch_check";
        cmd["id"] = "oppenheimer";
        cmd["tick"] = this.tick;
        this.sendPacketE(cmd, this.clients[this.currentPlayer]);
    }

    sendServerTick(){
        var cmd = {
            "id"	: -1,
            "command" : "set_tick",
            "value": this.tick,
            "turnEndTick": this.turnEndTick,
            "tick": 0
        };

        this.sendPacket(cmd);
    }

    endGame(){
        this.updateGameStatus("gameover");
        //set the status to gameover to pause any ticking, processing etc. and
        //don't free this slot. not yet.
        //give awards, show screens etc. first
        console.log(">> Game over!");

        var playerOrder = this.deadPlayers.reverse();
        var playerAlive = this.getPlayerAlive();
        if(playerAlive) playerOrder.unshift(playerAlive.player.id);

        if(playerOrder.length > 2){
            for(var i = 0; i < playerOrder.length; i++){
                if(!this.clients[playerOrder[i]]) continue;
                this.clients[playerOrder[i]].addXP(9 * (6 - i));
                this.clients[playerOrder[i]].addGold(12 * (6 - i), true);
            }
        }

        for(var key in this.clients){
            this.clients[key].sendGameStats(playerOrder);
        }

        var cmd = this.getGameRecord("endGame");
        this.sendPacket(cmd);
        //now you may set it free
        this.initialize();
    }

    sendChatMessage(msg){
        var cmd = {
            "command" : "chat",
            "text": msg,
            "id": 0,
            "ordered" : "true",
            "tick" : 0,
            "date": Date.now(),
            "dname" : "Bot"
        };

        this.sendPacket(cmd);
    }

    sendPlayerPosition(c){
        var cmd = {};
        cmd["command"] = "position";
        cmd["x"] = c.avatar.X;
        cmd["y"] = c.avatar.Y;
        cmd["tick"] = this.tick;
        cmd["_id"] = c.player.id;

        this.sendPacket(cmd);
    }

    requestSynch(){
        this.clients[this.currentPlayer].sendPacket({"command": "request_synch"});
    }

    //### getters ###

    getNextPlayerId(){
        var foundPlayer = false;
        for(var pKey in this.clients){
            if(!foundPlayer) {
                //console.log("Looking over: " + pKey + " " + this.clients[pKey].player.dname);

                if (parseInt(pKey) > this.currentPlayer && !this.clients[pKey].isDead()) {
                    //console.log("Found in first loop: " + pKey + " " + this.clients[pKey].player.dname + " compare " + (pKey > this.currentPlayer));

                    this.currentPlayer = pKey;
                    foundPlayer = true;
                }
            }
        }

        if(!foundPlayer) {
            for (var pKey in this.clients) {
                if (!foundPlayer) {
                    if (parseInt(pKey) < this.currentPlayer && !this.clients[pKey].isDead()) {
                        this.currentPlayer = pKey;
                        foundPlayer = true;
                        console.log("Found in second loop: " + pKey + " " + this.clients[pKey].player.dname);
                    }
                }
            }
        }

        if(!foundPlayer) return -1;

        console.log("current player is " + this.currentPlayer);
    }

    countPlayersAlive(){
        //2 - 0
        return (Object.keys(this.clients).length - this.deadPlayers.length);
    }

    getGameStatus(){
        return this.status;
    }

    getCurrentPlayer(){
        return this.currentPlayer;
    }

    getTick(){
        return this.tick;
    }

    getPlayerCount(){
        return Object.keys(this.clients).length;
    }

    getStatusCollection(){
        var playerList = [];
        for(var key in this.clients){
            var client = this.clients[key];
            playerList.push({"guid" : client.player.id, "status": client.player.status});
        }
        return playerList;
    }

    getPlayerList(){
        var playerList = [];
        for(var key in this.clients){
            var client = this.clients[key];
            playerList.push(client.player);
        }
        return playerList;
    }

    getString(command){
        var cmd = {};
        cmd.command         = command;
        cmd.status          = this.status;
        cmd.playerCount     = this.getPlayerCount();
        cmd.min             = this.min;
        cmd.id              = this.gameId;
        cmd.map             = this.mapName;
        cmd.players         = this.getStatusCollection();
        cmd.name            = this.mapName;
        cmd.skip            = this.skip;
        cmd.time            = new Date().getTime();
        cmd.gameDuration    = this.gameDuration;
        cmd.turnDuration    = this.turnDuration;
        cmd.cl              = this.cl;
        cmd.sumOfLevels     = this.sumOfLevels;
        cmd.session         = this.session;
        return cmd;
    }

    getClients(){
        return this.clients;
    }

    getPlayerIds(){
        var ids = [];
        for(var key in this.clients){
            var client = this.clients[key];
            ids.push(client.player.id.toString());
        }
        return ids;
    }

    getPlayerAlive(){
        for(var key in this.clients)
            if(!this.clients[key].isDead()) return this.clients[key];

        return null;
    }

    getGameRecord(cmd){
        var record = {
            "randomSeed"    : this.randomSeed,
            "co"		    : this.getPlayerIds(),
            "playerlist"    : this.getPlayerList(),
            "tick"          : 0,
            "currentPlayer" : this.currentPlayer,
            "command"       : cmd,
            "why"           : "Because we can."
        };

        return record;
    }

    //### checkers ###

    isRunning(){
        return this.status == "running";
    }

    isStarting(){
        return this.status == "starting";
    }

    isGameOver(){
        return this.status == "gameover";
    }
}

module.exports = Slot;
