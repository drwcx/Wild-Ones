"use strict";

var LobbyClient = require("./client/client.lobby.js"),
    LadderClient = require("./client/client.ladder.js"),
    GameClient = require("./client/client.game.js"),
    Utils = require('./helpers/utils.js'),
    Logger = require('./helpers/logger.js'),
    fs = require('fs');

var DEBUG = true;


class Handler{

	constructor(wopw){
		if(DEBUG){
			console.log(">> Initialized Handler");
		}
		this.WOPW = wopw;
		this.invalidItemLog = new Logger("invalidItem");
	}
    //### Utils ###

    extractLen(data){
        var lenStr = data.substr(0, 6);
        //console.log("lenstr " + lenStr);
        var len = 0;

        while(lenStr != ""){
            len = len * 10 + parseInt(lenStr.substr(0, 1));
            lenStr = lenStr.substr(1, lenStr.length - 1);
        }

        return len;
    }

    //### Packet processing ###

    handle(client, data){
        if(data.indexOf("<policy-file-request/>") >= 0){
            client.write('<cross-domain-policy><allow-access-from domain="*" to-ports="*" /></cross-domain-policy>\0');
        }else{
            try {
                this.handleJSON(client, data);
            }

            catch(e){
                console.log("exception: " + e);
            }
        }
    }

    handleJSON(client, data){
        console.log("handleJSON[ " + client.connectionType + "] " + data);
        if(!data) return;
        data = data.toString();

        var stateObject = client;

        /* INITIALIZE */
        if(data.indexOf("POST") >= 0){
            var path = data.split(" ")[1];
            var connectionType = (path.split("?")[0]).split("/")[2];

            client.connectionType = connectionType;

            if(connectionType == "game"){
                stateObject = new GameClient(client);
                client.fireChangeEvent();
                stateObject.WOPW.addClient(stateObject);
                try{
                    var tokens = (path.split("?")[1]).split("&");
                    var gameId = (tokens[0].split("="))[1];
                    var session = (tokens[1].split("="))[1];

                    stateObject.gameId = gameId;
                    stateObject.gameSession = session;
                }

                catch(e){
                    //throw e;
                }
            }else if(connectionType == "lobby"){
                //console.log("lobby client");
                stateObject = new LobbyClient(client);
                client.fireChangeEvent();
                stateObject.WOPW.addClient(stateObject);
            }else if(connectionType == "ladder"){
                //console.log("ladder client " + client.id);
                stateObject = new LadderClient(client);
                client.fireChangeEvent();
                stateObject.WOPW.addClient(stateObject);
            }

            data = data.substr(data.indexOf("\r\n\r\n"));
            data = data.substr(4);
        }

        if(data == "" || stateObject.connectionType == "") return;

        //in case data gets split!
        if(stateObject.awaitingData){
            if(DEBUG) console.log(">> waiting for more data");
            stateObject.tempBuffer += data;
            stateObject.dataParts++;
            if(stateObject.dataParts > 8){
                //stop awaiting for data
                if(DEBUG) console.log("!! giving up wait for more data " + stateObject.tempBuffer);
                stateObject.awaitingData = false;
                stateObject.tempBuffer = "";
                stateObject.tempBufferLen = 0;
                stateObject.dataParts = 0;
                return;
            }

            if(stateObject.tempBufferLen <= stateObject.tempBuffer.length){
                stateObject.awaitingData = false;

                if(stateObject.connectionType == "game"){
                    if(DEBUG) console.log(">> glued all the data together: " + stateObject.tempBuffer);
                    this.handleGameCommand(stateObject, JSON.parse(stateObject.tempBuffer.substr(0, stateObject.tempBufferLen)));
                    if(stateObject.tempBuffer.length > stateObject.tempBufferLen){
                        this.handleJSON(stateObject, stateObject.tempBuffer.substr(stateObject.tempBufferLen)); //what if this is incomplete??
                    }
                }
                stateObject.tempBuffer = "";
                stateObject.tempBufferLen = 0;
                stateObject.dataParts = 0;
                return;

            }else return; //await for some more data
        }

        //end case
        var len = this.extractLen(data);
        var content = data.substr(6);

        if(content.length < len){
            //I need more data
            stateObject.tempBuffer += content;
            stateObject.tempBufferLen = len;
            stateObject.awaitingData = true;
            stateObject.dataParts++;
            return;
        }

        if(stateObject.connectionType == "lobby"){
            this.handleLobbyCommand(stateObject, JSON.parse(content.substr(0, len)));
        }else if(stateObject.connectionType == "ladder"){
            this.handleLadderCommand(stateObject, JSON.parse(content.substr(0, len)));
        }else if(stateObject.connectionType == "game"){
            this.handleGameCommand(stateObject, JSON.parse(content.substr(0, len)))
        }

        //this.process(stateObject, JSON.parse(content.substr(0, len)));

        if(content.length > len){
            this.handleJSON(stateObject, content.substr(len));
        }
    }

    //### Packet handling ###

    handleLobbyCommand(client, packet){
        switch(packet.command) {
            case "logIn":
                console.log("handling login");
                this.handleLogin(client, packet);
                break;
            case "dname":
                break;
            case "ping":
                this.handlePing(client);
                break;
            case "setNewPlayerFlag":
                this.handleNewPlayerFlag(client, packet);
                break;
            case "modify_pet":
                this.handlePetModification(client, packet);
                break;
            case "quick_play":
                this.handleQuickPlay(client, packet);
                break;
            case "chance_wheel":
                this.handleChanceWheel(client, packet);
                break;
            case "change_pet":
                this.handleChangePet(client, packet);
                break;
            case "buy_accessory":
                this.handleBuyAccessory(client, packet);
                break;
            case "set_acc_load":
                this.handleAccLoad(client, packet);
                break;
            case "buy_pet":
                this.handleBuyPet(client, packet);
                break;
            case "delete_pet":
                this.handleDeletePet(client, packet);
                break;
            case "buy_ammo":
                this.handleBuyAmmo(client, packet);
                break;
            case "set_weapons_equipped":
                this.handleSetWeaponsEquipped(client, packet);
                break;
            case "game_name_check":
                this.handleGameNameCheck(client, packet);
                break;
            case "create_game":
                this.handleCreateGame(client, packet);
                break;
            case "join_game":
                this.handleJoinGame(client, packet);
                break;
        }
    }

    handleLadderCommand(client, packet){
        switch(packet.command){
            case "ping":
                this.handlePing(client);
                break;
        }
    }

    handleGameCommand(client, packet){
        //console.log("PACKET HANDLING: " + packet + "\n");
        client.lastMessageTime = Date.now();
        switch(packet.command){
            case "logIn":
                this.handleLogin(client, packet);
                break;
            case "ping":
                this.handlePing(client);
                break;
            case "start_server_connect":
                this.handleStartServerConnect(client, packet);
                break;
            case "chat":
                this.handleChat(client, packet);
                break;
            case "on_ready":
                this.handleOnReady(client, packet);
                break;
            case "not_ready":
                this.handleNotReady(client, packet);
                break;
            case "map_loaded":
                this.handleMapLoad(client, packet);
                break;
            case "synch_check":
                this.handleSynchCheck(client, packet);
                break;
            /*have to be processed*/
            case "move_left":
                this.handleMoveLeft(client, packet);
                break;
            case "move_right":
                this.handleMoveRight(client, packet);
                break;
            case "move_stop":
                this.handleMoveStop(client, packet);
                break;
            case "move_jump":
                this.handleMoveJump(client, packet);
                break;
            case "projectile":
                this.handleProjectile(client, packet);
                break;
            /*need not to be processed*/
            case "turn_complete":
                this.handleTurnComplete(client, packet);
                break;
            case "position":
                this.handlePosition(client, packet);
                break;
            case "request_synch":
                console.log("REQUEST SYNCH\n\n\n\n");
                //this.handleRequestSynch(client, packet);
                break;
            case "set_aim":
                this.handleSetAim(client, packet);
                break;
            case "start_fire":
                this.handleStartFire(client, packet);
                break;
            case "cancel_fire":
                this.handleCancelFire(client, packet);
                break;
            case "equip":
                this.handleEquip(client, packet);
                break;
            case "toggle_weapon":
                this.handleToggleWeapon(client, packet);
                break;
            case "retract_rope":
                this.handleRetractRope(client, packet);
                break;
            case "release_rope":
                this.handleReleaseRope(client, packet);
                break;
            case "stop_rope":
                this.handleStopRope(client, packet);
                break;
            case "detach":
                this.handleDetach(client, packet);
                break;
            case "teleport_stop":
                this.handleTeleportStop(client, packet);
                break;
            case "player_died":
                this.handlePlayerDied(client, packet);
                break;
            case "synch_pts":
                this.handleSynchPts(client, packet);
                break;
            case "log_projectile":
                this.handleLogProjectile(client, packet);
                break;
            case "synchronization":
                this.handleSynch(client, packet);
                break;
            case "exiting":
                this.handleExiting(client, packet);
                break;
        }
    }

    handleLogin(client, data){
        if(!data.dname || !data.snum){
            console.log("no dname / lkey");
            return;
        }
        client.db.count({"dname" : data.dname, "lkey" : data.snum}, (function(n){
            if(n > 0){
                client.db.fetch({"dname" : data.dname, "lkey" : data.snum}, (function(doc){
                    if(!doc) return;
                    console.log(">> Logged in successfully as " + doc.dname);


                    var logText = new Date().toString() + " -- " + doc.dname + " " + data.snum + " " + client.sock.remoteAddress + "\n";

                    fs.appendFile('logs/glogin_log.txt', logText, (err) => {

                    });

                    client.loggedIn = true;
                    console.log(">> Is logged in now? " + client.loggedIn);
                    if(client.setupPlayer(doc) == -1) return;
                    client.sendPlayerSetup();
                    client.sendUpdate();
                }).bind(this));
            }else{
                console.log(">> Oh no! The client has gotten into trouble.");
            }
        }).bind(this));
    }

    handlePing(client){
        client.sendPacket({"command" : "ping_ack"});
    }

    handleNewPlayerFlag(client, data){
        client.player.nw = -1;
        client.updatePlayerData();
    }

    handlePetModification(client, data){
        console.log("[" + client.connectionType  +"] handlePetModification");
        if(!client.player) console.log("no player data!");
        if(!client.player.ownedPets[data.petid]){
            console.log("*** Pet id is not valid");
            return;
        }

        client.player.ownedPets[data.petid].color1 = data.color1;
        client.player.ownedPets[data.petid].color2 = data.color2;
        client.player.ownedPets[data.petid].name   = data.name;
        client.updatePlayerData();
    }

    handleQuickPlay(client, packet){
        var mapDetails = this.WOPW.validateMapDetails(client, packet);
        if(DEBUG)
            console.log(">> Validated map details");
        var gameId = this.WOPW.findSlot(client, mapDetails, null);

        if(DEBUG)
            console.log(">> Found slot");
        if(gameId == 0){
            //The map details provided seem to be invalid
            return;
        }
		
		
		//send join game only after at least two players are in the slot
        client.gameId  = gameId;
        client.sendJoinGame();
    }

    handleStartServerConnect(client, data){
        //what happens if it connects after the game restarted?
        //what happens if i connect after the slot is full!?
        if(!client) return;
        client.db.count({"dname" : data.userId, "gkey" : client.gameSession}, (function(n){
            if(n > 0){
                client.db.fetch({"dname" : data.userId, "gkey" : client.gameSession}, (function(doc){
                    if(!doc) return;
                    console.log(">>>[game] Successfully logged in");
                    if(!client.getGame()) return;
                    if(client.setupPlayer(doc) == -1 || !client.player.id) return;

                    if(client.getGame().isFull()){
                        client.gameId = this.WOPW.findSimilarSlot(client.getGame());
                    }

                    client.getGame().addClient(client);
                    client.sendGamePlayers();
                    client.sendToGame(client.player);
                    client.updateGame();
                    client.getGame().stopGameStart();
                    //this.handleOnReady(client, null);

                }).bind(this));
            }
        }).bind(this));
    }

    handleChat(client, data) {
        //anti-spam protection
        client.getGame().sendPacketE(data, client);
        client.lastMessageTime = Date.now();
    }

    handleOnReady(client, data){
        client.getGame().updatePlayerStatus(client.player.id, "ready");
        console.log("client.player.status " + client.player.status);
        client.getGame().checkGame();
    }

    handleNotReady(client, data){
    }

    handleMapLoad(client, data){
    }

    handleSynchCheck(client, data){
        if(client.getGame().currentPlayer != client.player.id) return;
        client.getGame().lastSynchCheck = data;
        client.getGame().lastSynchTick = data.tick;

        //client.getGame().sendPacketE(data, client);
    }

    handleMoveLeft(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.avatar.isFacingRight = false;
        client.avatar.isWalkingLeft = true;
        client.avatar.isWalkingRight = false;
        client.avatar.setPosition(data.d[0], data.d[1]);
        client.getGame().sendPacketE(data, client);
    }

    handleMoveRight(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.avatar.isFacingRight = true;
        client.avatar.isWalkingLeft = false;
        client.avatar.isWalkingRight = true;
        client.avatar.setPosition(data.d[0], data.d[1]);
        client.getGame().sendPacketE(data, client);
    }

    handleMoveJump(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.avatar.jumpDirection = data.direction;
        client.avatar.waitingForJump = true;
        client.avatar.waitingForJumpTick = client.getGame().tick; //what tick?
        client.avatar.setPosition(data.d[0], data.d[1]);
        client.getGame().sendPacketE(data, client);
    }

    handleMoveStop(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.avatar.isWalkingLeft = false;
        client.avatar.isWalkingRight = false;
        client.avatar.setPosition(data.d[0], data.d[1]);
        client.getGame().sendPacketE(data, client);
    }

    handleTurnComplete(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            //sneaky bastard
            return;
        }
    }

    handlePosition(client, data){
        var cmd = {};
        cmd["command"] = "position";
        cmd["x"] = data.x;
        cmd["y"] = data.y;
        cmd["tick"] = data.tick;
        cmd["id"] = client.player.id;


        //client.getGame().sendPacketE(cmd, client);
    }

    handleSetAim(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.avatar.trueGunAngle = data.value;
        client.avatar.fpDistance = data.power;


        client.getGame().sendPacketE(data, client);
    }

    handleStartFire(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }
        client.avatar.setPosition(data.d[0], data.d[1]);
        client.getGame().sendPacketE(data, client);
    }

    handleCancelFire(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handleEquip(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handleToggleWeapon(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handleProjectile(client, data){
        //do I own this?
        //is it equipped?
        //did I already shoot?
        //how many remaining uses?
        //should I shorten turn time?
        if(client.getGame().currentPlayer != client.player.id){
            return;
        }

        if(client.avatar.alreadyShot){
            client.avatar.locked = true;
            return;
        }

        client.avatar.setPosition(data.d[0], data.d[1]);

        var properties = this.WOPW.weaponsObj[data.ammo_type];

        // < ------ -- --- - -- - - -- -- - - - ------ -- --- - -- - - -- -- - - - TO BE REDONE ------ -- --- - -- - - -- -- - - - ------ -- --- - -- - - -- -- - - - >
        if(!properties) return;

        //the player does not own it and it's harmful and it's not mortar -- what if it's from a crate?
        if((!client.player.userWeaponsOwned[data.ammo_type] || client.player.userWeaponsOwned[data.ammo_type] <= 0) && properties.timeAfter != -1
            && data.ammo_type != "mortar" && data.ammo_type != "punch" && data.ammo_type != "bone" && data.crate != "true"){ //what if i send packet with crate true with a nuke?
            client.avatar.alreadyShot = true;
            if(DEBUG) console.log("!! wep not owned!");
            return;
        }

        if(properties.timeAfter == null){ //harmful
            client.avatar.alreadyShot = true;
            if(DEBUG){
                console.log("Setting next turn at default time after weapon delay: " + this.WOPW.DEFAULT_TIME_AFTER_WEAPON);
            }
            client.getGame().setNextTurnFN(this.WOPW.DEFAULT_TIME_AFTER_WEAPON);
        }else if(properties.timeAfter > 0){ //harmful
            client.avatar.alreadyShot = true;
            console.log("Next turn in: " + (properties.timeAfter / 10));
            client.getGame().setNextTurnFN(properties.timeAfter / 10);


            client.addXP(Math.round(Math.random() * 10) + 1);
            client.addGold(Math.round(Math.random() * 5) + 1, true);
        }

        if(data.crate != "true") client.player.userWeaponsOwned[data.ammo_type] -= 1;

        client.updatePlayerData();
        client.sendUpdate();

        client.getGame().sendPacketE(data, client);
    }

    handleRetractRope(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handleReleaseRope(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handleStopRope(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handleDetach(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handleTeleportStop(client, data){
        if(client.getGame().currentPlayer != client.player.id || client.avatar.locked){
            return;
        }

        client.getGame().sendPacketE(data, client);
    }

    handlePlayerKill(client, data){
        console.log("player that emitted the `kill` flag is " + client.player.id);

        if(client.player.id == data.id){
            client.getGame().setPlayerDead(data.id);
        }

        //handle this
    }

    handleRequestSynch(client, data){
        //console.log("client who requested synch: " + client.player.id);
        console.log("client whos data was req: " + data.pid);
        client.sendPacket(client.getGame().clients[data.pid].getSynchCommand());

    }

    handleChanceWheel(client, data){
        if(client.connectionType == "lobby") {
            client.sendPacket
            (
                {
                    "command": "chance_wheel_return",
                    "value": client.getReward()
                }
            );
        }
    }

    handleChangePet(client, data){
        if(!client.ownsPet(data.name)) return;

        client.player.currentPet = data.name;
        client.sendUpdate();
        client.updatePlayerData();
    }

    handleBuyAccessory(client, data){
        if(client.connectionType != "lobby") return;

        var type = data.type;

        if(!this.WOPW.accessoriesObj[type]){
            console.log("type of accessory not found!");
            return;
        }

        if(this.WOPW.accessoriesObj[type].currency == "treats"){
            if(client.chargeTreats(this.WOPW.accessoriesObj[type].price)){
                client.player.userAccessories.push(type);
                client.sendUpdate();
                client.updatePlayerData();
            }else{
                if(DEBUG) console.log(">> not enough treats");
            }
        }else{
            if(client.chargeGold(this.WOPW.accessoriesObj[type].price)){
                client.player.userAccessories.push(type);
                client.sendUpdate();
                client.updatePlayerData();
            }else{
                if(DEBUG) console.log(">> not enough gold");
            }
        }
    }

    handleAccLoad(client, data){
        if(client.connectionType != "lobby") return;

        var valid = data.load.every(function(val) { return client.player.userAccessories.indexOf(val) >= 0; });

        var occurrences = {};
        for(var key in data.load){
            var item = data.load[key];
            //console.log("item in load : " + item);
            //console.log("item type " + Assets.shopData[item].type);
            occurrences[this.WOPW.accessoriesObj[item].type] = (occurrences[this.WOPW.accessoriesObj[item].type] != null) ? occurrences[this.WOPW.accessoriesObj[item].type] + 1 : 1;
            if(occurrences[this.WOPW.accessoriesObj[item].type] > 1){
                valid = false;
                break;
            }
        }

        if(valid){
            client.player.ownedPets[client.player.currentPet].accessories = data.load;
            client.sendUpdate();
            client.updatePlayerData();
        }else{
            console.log("Client "+ client.player.dname + " is feeling 1337 today!");
            //log event
        }
    }

    handleBuyPet(client, data){
        if(client.connectionType != "lobby") return;
        if(!data.name) return;

        if(this.WOPW.config.petDetailColors.indexOf(data.color2.toString(16)) < 0 || this.WOPW.config.petMainColors.indexOf(data.color1.toString(16)) < 0){
            if(DEBUG) console.log(">>> Color hack!");
            return;
        }

        if(!this.WOPW.petsObj[data.type]){
            if(DEBUG) console.log(">>> pet does not exist in crumbs " + data.type);
            return;
        }

        if(this.WOPW.petsObj[data.type].currency == "treats"){
            if(!client.chargeTreats(parseInt(this.WOPW.petsObj[data.type].price))){
                if(DEBUG) console.log(">> not enough treats for pet!");
                return;
            }
        }else{
            if(!client.chargeGold(parseInt(this.WOPW.petsObj[data.type].price))){
                if(DEBUG) console.log(">> not enough gold for pet!");
                return;
            }
        }

        if(DEBUG) console.log(">> surpassed checkers adopting pet!");

        var petInfo = {
            "id": Object.keys(client.player.ownedPets).length + 1,
            "gender": "M",
            "name": data.name,
            "color1": data.color1,
            "color2": data.color2,
            "kills": 0,
            "deaths": 0,
            "type": data.type,
            "pers": "physicist",
            "accessories": []
        };

        client.player.ownedPets[petInfo["id"]] = petInfo;
        client.sendUpdate();
        client.updatePlayerData();
    }

    handleDeletePet(client, data){
        if(client.connectionType != "lobby") return;
        if(!data.petId) return;

        var len = Object.keys(client.player.ownedPets).length + 1;

        if(len <= 2) return;

        for(var i = parseInt(data.petId); i < len - 1; i++){
            if(client.player.ownedPets[i] && client.player.ownedPets[i+1]){
                client.player.ownedPets[i] = client.player.ownedPets[i+1];
                client.player.ownedPets[i].id = i;
            }
        }

        delete client.player.ownedPets[len - 1];
        client.player.currentPet = 1;
        client.sendUpdate();
        client.updatePlayerData();
    }

    handleBuyAmmo(client, data){
        if(client.connectionType != "lobby") return;

        var type = data.ammoType;
        var count = data.ammoCount;

        if(!this.WOPW.weaponsObj[type]) {
            if(DEBUG)
                console.log(">> no wep of type " + type );
            return;
        }

        if(!count) return;

        //also check for level

        if(this.WOPW.weaponsObj[type].currency == "treats"){
            if(client.chargeTreats(this.WOPW.weaponsObj[type].price * data.ammoCount)){
                if(client.player.userWeaponsOwned[type]) client.player.userWeaponsOwned[type] += (this.WOPW.weaponsObj[type].purchaseAmount ? (parseInt(this.WOPW.weaponsObj[type].purchaseAmount) * data.ammoCount) : data.ammoCount);
                else client.player.userWeaponsOwned[type] = (this.WOPW.weaponsObj[type].purchaseAmount ? (parseInt(this.WOPW.weaponsObj[type].purchaseAmount) * data.ammoCount) : data.ammoCount);

                client.sendUpdate();
                client.updatePlayerData();
            }else if(DEBUG) console.log(">> could not afford treat wep " + type);

        }else{
            if(client.chargeGold(this.WOPW.weaponsObj[type].price * data.ammoCount)){
                if(client.player.userWeaponsOwned[type]) client.player.userWeaponsOwned[type] += (this.WOPW.weaponsObj[type].purchaseAmount ? (parseInt(this.WOPW.weaponsObj[type].purchaseAmount) * data.ammoCount) : data.ammoCount);
                else client.player.userWeaponsOwned[type] = (this.WOPW.weaponsObj[type].purchaseAmount ? (parseInt(this.WOPW.weaponsObj[type].purchaseAmount) * data.ammoCount) : data.ammoCount);
                client.sendUpdate();
                client.updatePlayerData();
            }else if(DEBUG) console.log(">> could not afford wep gold" + type);
        }
    }

    handleSetWeaponsEquipped(client, data){
        var validSet = true;
        for(var i = 0; i < data.value.length; i++){
            //fix asap
            //["walk", "empty", "climb", "dig", "superjump", "bone", "punch"],
            if(data.value[i] == "mortar" || data.value[i] == "superjump" || data.value[i] == "empty" || data.value[i] == "punch" || data.value[i] == "walk" || data.value[i] == "bone"
            || data.value[i] == "dig" || data.value[i] == "climb" || data.value[i] == ""){
                continue;
            }

            if(!client.player.userWeaponsOwned[data.value[i]]){
                console.log(">> invalid_set: " + data.value[i]);
                invalidItemLog.write("Supposedly invalid item: " + data.value[i]);
                validSet = false;
                break;
            }
        }

        if(!validSet) return;

        client.player.userWeaponsEquipped = data.value;
        client.sendUpdate();
        client.updatePlayerData();
    }

    handleSynchPts(client, data){
        data.command = "adjust_pts";
        data.id = client.player.id;
        data.value = Utils.stringToInt(data.value);
        if(data.value <= 0) return;
        //client.getGame().sendPacketE(data, client);
    }

    handleLogProjectile(client, data){
        //data.weapon
        //data.x
        //data.y
        //data.vx
        //data.vy
        fs.appendFile('logs/' + data.weapon + '_xy.txt', (data.x + " " + data.y + "\n"), function (err) {
            console.log(err);
        });

        fs.appendFile('logs/' + data.weapon + '_vxvy.txt', (data.vx + " " + data.vy + "\n"), function (err) {
            console.log(err);
        });
    }

    /*TO DO: move game_name_return to a function */
    handleGameNameCheck(client, data){
        if(/^[a-zA-Z0-9- ]*$/.test(data.name) == false) {
            return;
        }

        var cmd = {
            command:"game_name_return",
            name: data.name,
        };

        if(this.WOPW.getGame(data.name))
            cmd.value = 0;
        else cmd.value = 1;

        client.sendPacket(cmd);
    }

    handleCreateGame(client, data){
        if(/^[a-zA-Z0-9- ]*$/.test(data.gameName) == false) {
            return;
        }

        data.gameName = data.gameName.split(' ').join('-');

        if(this.WOPW.getGame(data.gameName)){
            client.sendPacket({
                command:"game_name_return",
                name: data.gameName,
                value: 0
            });
            return;
        }

        var mapDetails = this.WOPW.validateMapDetails(client, data);
        var gameId     = this.WOPW.findSlot(client, mapDetails, data.gameName);

        if(gameId == 0){
            //game is running!
            return;
        }

        client.gameId  = gameId;
        client.sendJoinGame();
    }

    handleJoinGame(client, data){
        if(/^[a-zA-Z0-9- ]*$/.test(data.gameName) == false) {
            return;
        }

        data.gameName = data.gameName.split(' ').join('-');
        var gameRef = this.WOPW.getGame(data.gameName);
        if(gameRef){
            if(!gameRef.isRunning()){
                gameRef.addClient(client);
                client.gameId = data.gameName;
                client.sendJoinGame();
            }
        }
    }

    handleSynch(client, data){
        data.command = "set_synch";
        data.id = "oppenheimer";
        data.gameRecord = null;//client.getGame().getGameRecord("startGame");
        data.timeLoop.activeAvatar = client.getGame().currentPlayer;
        data.timeLoop.currentTick = client.getGame().tick;
        data.timeLoop.commandQueue = [];


        for(var i = 0; i < data.avatarList.length; i ++){
            data.avatarList[i].isWalkingLeft = "false";
            data.avatarList[i].isWalkingRight = "false";

            var hp = Utils.stringToInt(data.avatarList[i].hp);

            if(hp == 0 && client.getGame().clients[data.avatarList[i].player] && !client.getGame().clients[data.avatarList[i].player].isDead()){
                client.getGame().setPlayerDead(data.avatarList[i].player);
                //client.getGame().checkGame();
                if(DEBUG) console.log(">> set player dead after synch");
            }
        }

        client.getGame().sendPacket(data);
    }

    handlePlayerDied(client, data){
        client.getGame().setPlayerDead(parseInt(data.id));
    }

    handleExiting(client, data){
        client.getGame().sendPacketE(data, client);
    }
}

module.exports = Handler;
