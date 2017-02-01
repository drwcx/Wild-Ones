var Utils = require('../helpers/utils.js'),
	Avatar = require('./extensions/avatar.js')

function GameClient(clientRef) {
	/* Events */
	/* Point data to here */

	clientRef.newObject = this;

	/* References */
	this.sock   = clientRef.sock;
    this.db     = clientRef.db;
    this.WOPW   = clientRef.WOPW;

	/* Connection details */
	this.newPacketHeader = "Originality is undetected plagiarism.\r\n\r\n";
	this.connectionType  = clientRef.connectionType;
	this.initialized     = false;
	this.mapLoaded       = false; //reset this

	/* Buffers and settings */
	this.tempBuffer = "";
	this.tempBufferLen = 0;
	this.awaitingData  = false;
	this.dataParts = 0;

	/* Client data */
	this.id = clientRef.id;

	/* Client state */
	this.loggedIn = false;

	/* Player data */
	this.player = {};
	this.avatar = new Avatar(this);

	/* Trackers */
    this.lastMessageTime = 0;
    this.shotThisTurn = false;

	/* Rewards */
	this.startingXP = 0;
	this.startingGold = 0;

	/* Slot data */
	this.gameId = null;
	this.gameSession = "";

	console.log(">> Initialized game client");
}

GameClient.prototype = {
	// ### initialization functions ###
	setupPlayer : function(doc){
        if(!doc){
            return -1;
        }

		this.player.id = doc.id;
		this.player.nw = doc.nw;
		this.player.level = doc.level;
		this.player.currentPet = doc.currentPet;
		this.player.login_streak = doc.login_streak;
		this.player.playerStatus = doc.playerStatus;
		this.player.status = doc.status;
		this.player.net = doc.net;
		this.player.snum = doc.snum;
		this.player.gamecount = doc.gamecount;
		this.player.gold = doc.gold;
		this.player.treats = doc.treats;
		this.player.hp = doc.hp;
		this.player.wins = doc.wins;
		this.player.sesscount = doc.sesscount;
		this.player.losses = doc.losses;
		this.player.speed = doc.speed;
		this.player.attack = doc.attack;
		this.player.defence = doc.defence;
		this.player.jump = doc.jump;
		this.player.xp = doc.xp;
		this.player.userAccessories = doc.userAccessories;
		this.player.durability = doc.durability;
		this.player.ownedPets = doc.ownedPets;
		this.player.userWeaponsOwned = doc.userWeaponsOwned;
		this.player.userWeaponsEquipped = doc.userWeaponsEquipped;
		this.player.allowedMaps = doc.allowedMaps;
		this.player.dname = doc.dname;
		this.player.command = "player";
		this.player.online = this.WOPW.getLobbyLoad();
		console.log(">> " + this.player.dname  + " entered game");
		this.avatar.initialize();
        return 1;
	},

	//### adapters ###

	updateGame : function(){
		this.getGame().sendPacket(this.getGame().getString("game"));
	},

	setMapLoadStatus : function(v){
		this.mapLoaded = v;
	},

	updateCoordinates : function(x, y){
		this.avatar.X = x;
		this.avatar.Y = y;
	},

	updateVelocities : function(vx, vy){
		this.avatar.Vx = vx;
		this.avatar.Vy = vy;
	},

    resetTurnChanges : function(){
		this.avatar.alreadyShot = false;
		this.avatar.locked = false;
    },

	addXP : function(amount){
    	this.player.xp += amount;

		this.sendUpdate();
		this.updatePlayerData();
	},

	addGold : function(amount, update){
		this.player.gold += amount;
		if(update) {
			this.sendUpdate();
			this.updatePlayerData();
		}
	},

	addTreats : function(amount, update){
		this.player.treats += amount;
		if(update) {
			this.sendUpdate();
			this.updatePlayerData();
		}
	},

	//### checkers ###

	ownsPet : function(id){
		return this.player.ownedPets[id] != null;
	},

	isCurrentPlayer : function(){
		return this.getGame().currentPlayer == this.player.id;
	},

	isDead : function(){
		return this.avatar.dead;
	},

	// ### getters ###

	getGame : function(){
		return this.WOPW.getGame(this.gameId);
	},

	sendProjectileReward : function(){
		this.addXP(Math.floor(Math.random() * 10 + 1));
	},

	sendGameOverReward : function(rank){
		//this.addGold(Config.goldSet[rank - 1], false);
		//this.addTreats(Config.treatSet[rank - 1], true);
	},

	sendGamePlayers : function(){
		var users = this.WOPW.getGame(this.gameId).getClients();
		for(var usrKey in users){
			var el = users[usrKey];
			if(el.player.id != this.player.id){
				this.sendPacket(el.player);
			}
		}
	},

	sendToGame : function(packet){
		this.getGame().sendPacket(packet);
	},

	sendStartGame : function(){
		var cmd = {
			"command" 		: "startGame",
			"randomSeed"	: this.getGame().randomSeed,
			"co"			: this.getGame().getPlayerIds(),
			"currentPlayer" : this.getGame().getCurrentPlayer(),
			"tick"			: this.getGame().getTick(),
			"playerlist"	: this.getGame().getStatusCollection()
		};

		this.sendPacket(cmd);
	},

	sendServerTick : function(val1, val2){
		var cmd = {
			"id"	: -1,
			"command" : "set_tick",
			"value": val1,
            "turnEndTick": val2,
			"tick": 0
		};

		this.sendPacket(cmd);
	},

	sendUpdate : function(){
		this.sendPacket(this.player);
        this.WOPW.updateLobbyPlayer(this.player);
	},

    sendChatMessage : function(msg){
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
    },

	sendGameStats : function(playerOrder){
		var statsCmd = {
			"command" : "game_stats",
			"startLevel": 0,
			"damageGold": 0,
			"killsGold": 0,
			"placeGold": 0,
			"damageXp": 0,
			"kills": 0,
			"endLevel": 0,
			"placeXp": 0,
			"killsXp": 0,
			"endingXP": 0,
			"players": playerOrder,
			"place": 0,
			"damage": 0,
			"startingXP": 0
		};
		console.log("Send game stats!");
		this.sendPacket(statsCmd);
	},

	// ### socket helpers ###
	sendPacket : function(packet){
		packet = JSON.stringify(packet);

		var len = packet.length;
		len = ("000000" + len).slice(-6);
		//console.log("sending packet size: " + len + " " + packet);


		if(!this.initialized){
			this.initialized = true;
			packet = len + packet;
			packet = this.newPacketHeader + packet;
			//console.log(">> sending first packet ");
			this.write(packet);
			return;
		}

		packet = len + packet;
		this.write(packet);
	},

	write : function(str){
		if(!this.sock.readyState || this.disconnected) return;

		try{
			this.sock.write(str);
		}

		catch(e){
			console.log("writing: " + e);
		}
	},

	//### database modifiers ###

	updatePlayerData : function(){
		this.db.update({"id" : this.player.id}, this.player);
	}
};

module.exports = GameClient;
