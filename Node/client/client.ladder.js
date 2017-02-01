
function LadderClient(clientRef) {
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

	/* Player data */
	this.player = {};

	console.log(">> Initialized ladder client");
}

LadderClient.prototype = {

	// ### initialization functions ###
	setupPlayer : function(doc){
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
		console.log(">> " + this.player.dname  + " entered ladder");
	},

	// ### socket helpers ###
	sendPacket : function(packet){
		packet = JSON.stringify(packet);

		var len = packet.length;
		len = ("000000" + len).slice(-6);
		console.log("sending packet size: " + len + " " + packet);


		if(!this.initialized){
			this.initialized = true;
			packet = len + packet;
			packet = this.newPacketHeader + packet;
			console.log(">> sending first packet ");
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

module.exports = LadderClient;
