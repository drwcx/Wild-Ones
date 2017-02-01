var Utils	= require('../helpers/utils.js');

function LobbyClient(clientRef) {
	/* Events */
	/* Point data to here */

	clientRef.newObject = this;

	/* References */
	this.sock = clientRef.sock;
    this.db = clientRef.db;
    this.WOPW = clientRef.WOPW;

	/* Connection details */
	this.newPacketHeader = "Originality is undetected plagiarism.\r\n\r\n";

	this.connectionType = clientRef.connectionType;
	this.initialized = false;

	/* Buffers and settings */
	this.tempBuffer = "";
	this.tempBufferLen = 0;
	this.awaitingData = false;
	this.dataParts = 0;

	/* Client data */
	this.id = clientRef.id;

	/* Client state */
	this.loggedIn = false;

	/* Player data */
	this.player = {};

	/* Slot data */
	this.gameId = null;
	this.gameSession = "";

	console.log(">> Initialized lobby client");
}

LobbyClient.prototype = {
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
		this.player.command = "setPlayer";
		this.player.online = this.WOPW.getLobbyLoad();
		console.log(">> " + this.player.dname  + " entered lobby");
        return 1;
	},
	// ### checkers ###

	ownsPet : function(id){
		return this.player.ownedPets[id] != null;
	},

	// ### database modifiers ###

	updatePlayerData : function(){
		this.db.update({"id" : this.player.id}, this.player);
	},

	updateGameKey : function(gameSession){
		this.db.update({"id" : this.player.id}, {"gkey": gameSession});
		return gameSession;
	},

	// ### property updaters  ###
	chargeTreats : function(amount){
		if(amount < 0) return false;
		this.player.treats = parseInt(this.player.treats);
		if(this.player.treats >= amount){
			this.player.treats -= amount;
			this.sendUpdate();
			this.updatePlayerData();
			return true;
		}else return false;
	},

	chargeGold : function(amount){
		if(amount < 0) return false;
		this.player.gold = parseInt(this.player.gold);
		if(this.player.gold >= amount){
			this.player.gold -= amount;
			this.sendUpdate();
			this.updatePlayerData();
			return true;
		}else return false;
	},

	addWeapon : function(type, amount){
		if(this.player.userWeaponsOwned[type]) this.player.userWeaponsOwned[type] += amount;
		else this.player.userWeaponsOwned[type] = amount;

		this.sendUpdate();
		this.updatePlayerData();
	},

	getReward : function(){
		if(!this.chargeTreats(2))
			return {
				"reward" : null
			};

		var weaponType = "teleport";
		var amount = 0;
		var special = 0;
		var val = Math.floor(Math.random() * 100);

		if   ( 0 <= val && val 		<=  7) { weaponType = "teleport"; amount = 2; special = 0; }
		else if( 8 <= val && val 	<= 15) { weaponType = "teleport"; amount = 3; special = 0; }
		else if(16 <= val && val 	<= 24) { weaponType = "teleport"; amount  = 4; special = 0; }
		else if(25 <= val && val 	<= 49) { weaponType = "grappling"; amount = 2; special = 0; }
		else if(50 <= val && val 	<= 58) { weaponType = "grenade"; amount = 2; special = 0; }
		else if(              val 	== 59) { weaponType = "grenade"; amount = 50; special = 1; }
		else if(60 <= val && val 	<= 68) { weaponType = "flamethrower"; amount = 1; special = 0; }
		else if(              val 	== 69) { weaponType = "flamethrower"; amount = 3; special = 0; }
		else if(70 <= val && val 	<= 78) { weaponType = "goo"; amount = 1; special = 0; }
		else if(              val 	== 79) { weaponType = "goo"; amount = 3; special = 0; }
		else if(80 <= val && val 	<= 89) { weaponType = "mirv"; amount = 1; special = 0; }
		else if(90 <= val && val 	<= 94) { weaponType = "drill"; amount = 1; special = 0; }
		else if(95 <= val && val 	<= 100){ weaponType = "lasercannon"; amount = 1; special = 1; }

		this.addWeapon(weaponType, amount);

		var rtn = {};
		rtn["reward"] = {};
		rtn["reward"][weaponType] = amount;
		rtn["special"] = (special ? "true" : "false");
		return rtn;
	},

	// ### keygen(s) ###

	generateGameKey : function(){
		this.gameSession = this.updateGameKey(Utils.randKey());
		return this.gameSession;
	},

	// ### reply methods ###

	sendPlayerSetup : function(){
		this.sendPacket(this.player);
		this.player.command = "player";
	},

	sendUpdate : function(){
		this.sendPacket(this.player);
	},

	sendJoinGame : function(){
		var cmd = this.WOPW.getJoinCommand(this.gameId);

        cmd.session = this.generateGameKey();
		this.sendPacket(cmd);
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
		if(!this.sock.readyState) return;

		try{
			this.sock.write(str);
		}

		catch(e){
			console.log(e);
		}
	}
};

module.exports = LobbyClient;
