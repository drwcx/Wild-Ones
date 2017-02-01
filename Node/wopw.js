"use strict";

var
    gameport                = 8000,
    UUID 					= require('node-uuid'),
    net                     = require('net'),
    request                 = require('request'),

    Database                = require('./database.js'),
    PacketHandler           = require('./handler.js'),
    Slot                    = require('./slot.js'),
    Utils                   = require('./helpers/utils.js'),

    Client                  = require('./client/client.abstract.js'),

    AccessoriesProperties   = require('./properties/accessories.properties.js'),
    WeaponProperties        = require('./properties/weapon.properties.js'),
    MapProperties           = require('./properties/map.properties.js'),
    PetFoodProperties       = require('./properties/pet.food.properties.js'),
    ChassisProperties       = require('./properties/chassis.properties.js');

var DEBUG = true;

class WOPW{
	constructor() {
	    //initialize containers
	    this.lobbyClients = {};
	    this.ladderClients = {};
	    this.slots = {};
	
	    // setup database
	    this.db = new Database();
	    this.db.connect();
	
	    // setup packet Handler
	    this.packetHandler = new PacketHandler(this);
	
	    //assets
	    this.assetsURL = "http://wildones.pw/assets/json/";
	    this.assetsCacheVersion = "debug_0002";
	    this.assetsList = ["Config", "Accessories", "Crate", "Gifts", "Levels", "Maps", "Other", "PetFoods", "Pets", "WeaponsGrid"];
	    this.assetsObj = {};
	
	    this.config         = {};
	    this.accessoriesObj = {};
	    this.crateObj       = {};
	    this.levelsObj      = {};
	    this.weaponsObj     = {};
	    this.mapsObj        = {};
	    this.petFoodsObj    = {};
	    this.petsObj    = {};
	
	    this.itemLevel = {};
	
	    //initialize timers
	
	    this.DEFAULT_TIME_AFTER_WEAPON = 400;
	}

    interval(func, wait, times){
        var interv = function(w, t){
            return function(){
                if(typeof t === "undefined" || t-- > 0){
                    setTimeout(interv, w);
                    try{
                        func.call(null);
                    }
                    catch(e){
                        t = 0;
                        //throw e.toString();
                    }
                }
            };
        }(wait, times);

        setTimeout(interv, wait);
    }

    start(){
        this.loadAssets(0);
        this.procTimer = this.interval(this.update.bind(this), 100); //25 fps => 40ms
        //tick 50 = 500 ms
        //tick 1  = 40 ms
        //
    }

    // Assets
    loadAssets(pos){
        var item = this.assetsList[pos];
        request(this.assetsURL + item + ".dat?cachev=" + this.assetsCacheVersion, function (error, response, body) {
            this.assetsObj[item] = JSON.parse(body);
            console.log("Loaded asset: " + item);

            if(this.assetsList.length - 1 > pos)
                this.loadAssets(pos + 1);
            else this.onAssetsLoaded();

        }.bind(this));
    }

    onAssetsLoaded(){
        if(DEBUG) console.log("All assets loaded. Processing..");
        this.processConfig();
        this.processAccessories();
        this.processCrate();
        this.processLevels();
        this.processMaps();
        this.processPetFoods();
        this.processPets();
        this.processWeaponsGrid();
        if(DEBUG) console.log("Done processing. \n");
        this.run();
    }

    processConfig(){
        this.config = this.assetsObj["Config"];
    }

    processAccessories(){
        for(var i = 0; i < this.assetsObj["Accessories"].length; i++){
            var obj = new AccessoriesProperties();

            for(var property in this.assetsObj["Accessories"][i])
                obj[property] = this.assetsObj["Accessories"][i][property];

            this.accessoriesObj[obj.type] = obj;
        }
    }

    processCrate(){
        this.crateObj = this.assetsObj["Crate"];
    }

    processLevels(){
        this.levelsObj = this.assetsObj["Levels"];

        var _level = 1;
        for(var i in this.levelsObj){
            var level = this.levelsObj[i];
            for(var itemIndex in level.map){
                this.itemLevel[level.map[itemIndex]] = (_level);
                if(DEBUG) console.log("item " + level.map[itemIndex] + " has level " + (_level));
            }
            for(var itemIndex in level.chassis){
                this.itemLevel[level.chassis[itemIndex]] = (_level);
                if(DEBUG) console.log("item " + level.chassis[itemIndex] + " has level " + (_level));
            }
            for(var itemIndex in level.weapon){
                this.itemLevel[level.weapon[itemIndex]] = (_level);
                if(DEBUG) console.log("item " + level.weapon[itemIndex] + " has level " + (_level));
            }
            _level++;
        }
    }

    processMaps(){
        for(var i = 0; i < this.assetsObj["Maps"].length; i++){
            var obj = new MapProperties();

            for(var property in this.assetsObj["Maps"][i])
                obj[property] = this.assetsObj["Maps"][i][property];

            this.mapsObj[obj.name] = obj;
        }
    }

    processPetFoods(){
        for(var i = 0; i < this.assetsObj["PetFoods"].length; i++){
            var obj = new PetFoodProperties();

            for(var property in this.assetsObj["PetFoods"][i])
                obj[property] = this.assetsObj["PetFoods"][i][property];

            this.petFoodsObj[obj.type] = obj;
        }
    }

    processPets(){
        for(var i = 0; i < this.assetsObj["Pets"].length; i++){
            var obj = new ChassisProperties();

            for(var property in this.assetsObj["Pets"][i])
                obj[property] = this.assetsObj["Pets"][i][property];

            this.petsObj[obj.type] = obj;
        }
    }

    processWeaponsGrid(){
        for(var i = 0; i < this.assetsObj["WeaponsGrid"].length; i++){
            var obj = new WeaponProperties();

            for(var property in this.assetsObj["WeaponsGrid"][i])
                obj[property] = this.assetsObj["WeaponsGrid"][i][property];

            this.weaponsObj[obj.type] = obj;
        }
    }

    // Client handling
    run(){
        console.log(">> Accepting clients on " + gameport);

        net.createServer(function (socket) {
            socket.name = socket.remoteAddress + ":" + socket.remotePort;
            socket.id = UUID();
            console.log("generated socket id: " + socket.id);
            var obj = new Client(socket, this.db, this);
            if(DEBUG)
                console.log(">> CLIENT " + socket.name + " " + obj.id);
            //### event handlers ###
            //### scope handler ###
            obj.eventTrigger.on('newScope', function(){
                if(DEBUG)
                    console.log(">>> New object was assigned");
                obj = obj.newObject;
            });
            //### data handler ###
            socket.on('data', function (data) {
                try {
                    this.packetHandler.handle(obj, data);
                }
                catch(e){
                    if(DEBUG)
                        console.log("!! Data error: " + e);
                }
            }.bind(this));
            //### error handler ###
            socket.on('error', function (e) {
                if(DEBUG)
                    console.log("!! Sock error: " + e);
            }.bind(this));

            //### disconnection handler ###
            socket.on('close', function () {
                this.removeClientObj(obj);
            }.bind(this));

            socket.on('end', function(){
                this.removeClientObj(obj);
            }.bind(this));
        }.bind(this)).listen(gameport, "0.0.0.0");
    }

    //### Timers ###

    update(){
        //This is running at 25 FPS
        for (var key in this.slots) {
            var g = this.slots[key];
            g.update();
        }
    }

    //### Game related ###

    validateMapDetails(client, data){
        if(this.config.turnTimes.indexOf(data.turnDuration) < 0)
            data.turnDuration = this.config.turnTimes[Math.floor(Math.random() * this.config.turnTimes.length)];


        if(this.config.gameTimes.indexOf(data.gameDuration) < 0)
            data.gameDuration = this.config.gameTimes[Math.floor(Math.random() * this.config.gameTimes.length)];


        if(this.config.maxPlayers.indexOf(data.playerCount) < 0)
            data.playerCount = this.config.maxPlayers[Math.floor(Math.random() * this.config.maxPlayers.length)];


        if(!this.mapsObj[data.mapName]){
            if(client.player.xp > 20557)
                data.mapName = this.mapsObj["Sink or Swim"].name;
            else
                data.mapName = this.mapsObj["Sink or Swim"].name;
        }

        return data;
    }

    findSimilarSlot(map){
        var mapName = map.gameId;
        var gameNumber = parseInt(mapName.substring(mapName.length - 1));
        var gameId = mapName.substring(0, mapName.length - 1); //without last character

        for(var i = gameNumber + 1; i < this.config.maxSlots; i++){
            var tmpId = gameId + i;
            if(this.slots[tmpId]){
                if(this.slots[tmpId].isRunning() || this.slots[tmpId].isGameOver()  || (this.slots[tmpId].startingTime != 0 && this.slots[tmpId].startingTime <= (Date.now() + 1000))){
                    console.log(">> Occupied slot: date time now is " + (Date.now()));
                    console.log(">> Occupied slot: starting time is "+ this.slots[tmpId].startingTime);
                    continue;
                }

                if(this.slots[tmpId].getPlayerCount() < map.playerCount){
                    return tmpId;
                }else continue;
            }else{
                this.createSlot(tmpId, map.mapName, map.playerCount, map.gameDuration, map.turnDuration);
                return tmpId;
            }
        }
    }

    findSlot(client, mapDetails, customName){
        if(!(mapDetails.hasOwnProperty('mapName') && mapDetails.hasOwnProperty('playerCount')
                && mapDetails.hasOwnProperty('gameDuration') && mapDetails.hasOwnProperty('turnDuration')))
            return 0;


        if(!this.mapsObj[mapDetails.mapName])                          return 0;
        if(this.config.gameTimes.indexOf(mapDetails.gameDuration) < 0) return 0;
        if(this.config.turnTimes.indexOf(mapDetails.turnDuration) < 0) return 0;
        if(this.config.maxPlayers.indexOf(mapDetails.playerCount) < 0) return 0;

        var mapName         = mapDetails.mapName,
            playerCount     = parseInt(mapDetails.playerCount),
            gameDuration    = parseInt(mapDetails.gameDuration) * 60 * 1000,
            turnDuration    = parseInt(mapDetails.turnDuration) * 1000;
        var gameId          = null;

        if(customName){
            gameId = customName;

            if(this.slots[gameId]){
                if(this.slots[tmpId].isRunning() || this.slots[tmpId].isGameOver() || (this.slots[tmpId].startingTime != 0 && this.slots[tmpId].startingTime <= (Date.now() + 1000))){
                    return 0;
                }
            }else{
                this.createSlot(gameId, mapName, playerCount, gameDuration, turnDuration);
                if(DEBUG) console.log(">> Created slot with gameId = " + gameId);
                return gameId;
            }
        }else{
            gameId = [mapName, playerCount, gameDuration,turnDuration].join("_") + "_";

            gameId = gameId.split(' ').join('-');

            for(var i = 0; i < this.config.maxSlots; i++){
                var tmpId = gameId + i;
                if(this.slots[tmpId]){
                    if(this.slots[tmpId].isRunning() || this.slots[tmpId].isGameOver()  || (this.slots[tmpId].startingTime != 0 && this.slots[tmpId].startingTime <= (Date.now() + 1000))){
                        console.log(">> Occupied slot: date time now is " + (Date.now()));
                        console.log(">> Occupied slot: starting time is "+ this.slots[tmpId].startingTime);
                        continue;
                    }

                    if(this.slots[tmpId].getPlayerCount() < playerCount){
                        return tmpId;
                    }else continue;
                }else{
                    this.createSlot(tmpId, mapName, playerCount, gameDuration, turnDuration);
                    return tmpId;
                }
            }
        }
    }

    createSlot(gameId, mapName, playerCount, gameDuration, turnDuration){
        this.slots[gameId] = new Slot(this, gameId, mapName, playerCount, gameDuration, turnDuration);
    }

    getJoinCommand(gameId){
        return this.slots[gameId].getString("join");
    }

    getGame(gameId){
        return this.slots[gameId];
    }

    updateLobbyPlayer(newPlayer){
        for(var key in this.lobbyClients){
            var lc = this.lobbyClients[key];
            if(lc.player.id == newPlayer.id){
                lc.player = newPlayer;
                break;
            }
        }
    }

    getLobbyLoad(){
        return Object.keys(this.lobbyClients).length;
    }

    //### add / remove client ###

    addClient(obj){
    	console.log("adding client UUID: " + obj.sock.id);
        if(obj.connectionType == "lobby")
            this.lobbyClients[obj.sock.id] = obj;
        else if(obj.connectionType == "ladder")
            this.ladderClients[obj.sock.id] = obj;
    }

    removeClientObj(obj){
        console.log(">> disconnectClient was called");

        if(obj.connectionType == "lobby")
            delete this.lobbyClients[obj.sock.id];
        else if(obj.connectionType == "ladder")
            delete this.ladderClients[obj.sock.id];
        else if(obj.connectionType == "game"){
            if(obj.gameId && this.slots[obj.gameId]){
                this.slots[obj.gameId].removeClient(obj);
            }
        }else{
            console.log("!! Object with undefined connectionType disconnected");
        }
    }
};

module.exports = WOPW;
