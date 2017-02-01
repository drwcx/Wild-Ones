"use strict";

var Physical = require("../../physics/physical.js");
var CollisionAverage = require("../../physics/collision.js");
var Point = require("../../helpers/point.js");

class Avatar extends Physical{
	constructor(parent){
		super();
		this.parent = parent;
		this.maxFireTick = 200;
		this.maxWalkSpeed = 0.004;
		this.gunFirePower = 0;
		this.gunX = 0;
		this.gunY = 0;
		this.climbBoundPoints =[];
		this.chassis = "";;
		this.jump = 0.2;
		this.averageHit = null;
		this.isHitBig = false;
		this.underwater = false;
		this.gunLength = 45;
		this.waitingForJumpTick = 0;
		this.reticleLength = 105;
		this.groundPoints = [];
		this.isWalkingRight = false;
		this.accumulateDamage = {};
		this._climbing = false;
		this._grappling = false;
		this.startFireTick = 0;
		this.moveGrappling = 0;
		this.waitingForJump = false;
		this.superJumpTick = -10000;
		this.lastHealth = -1;
		this.isClient = false;
		this.isWalkingLeft = false;
		this.holdRight = false;
		this.shotX = 0;
		this.shotY = 0;
		this.minAngle = 0;
		this.digging = false;
		this.wasLastFacingRight = false;
		this.gooTick = 0;
		this.maxAngle = 1.5707963267949;
		this.angle = 0;
		this.isFacingRight = false;
		this.walkAcceleration = 0.01;
		this.jumpDirection = "up";
		this.maxFPDistance = 450;
		this.fpDistance = 0;

		this.dead = false;
	}

	initialize(){
		this.type = "avatar";
		/*this.markerRadius = 3;
		this.chassis = this.parent.player.ownedPets[this.parent.player.currentPet.toString()].type;
		this.properties = this.parent.WOPW.petsObj[this.chassis];
		this.drowningProperties = this.parent.WOPW.weaponsObj["drowning"];
		this.superjumpProperties = this.parent.WOPW.weaponsObj["superjump"];
		this.climbProperties = this.parent.WOPW.weaponsObj["climb"];

		this.healthPoints = this.properties.hp; //+this.bonus.health_points

		this.boundRadius = this.properties.size;
		console.log("set boundRadius of pet to: " + this.boundRadius);
		this.bounce = this.properties.bounce;
		this.jump = this.properties.jump;
		this.maxWalkSpeed = this.properties.speed; //(1 + this.bonus.walk_speed * 0.01)
		this.boundRadius2 = this.boundRadius * this.boundRadius;
		this.checkRadius = this.boundRadius + 1;

		this.setBoundPoints();
		this.climbBoundPoints = this.getCircularPoints(this.boundRadius);
		this.groundPoints = this.getCircularPoints(this.boundRadius + 2);

		this.climbBoundPoints = this.getCircularPoints(this.boundRadius);
		this.groundPoints = this.getCircularPoints(this.boundRadius + 2);*/
	}

	setBoundPoints(){
		var halfBound = this.boundRadius * 0.5;
		var semiCircleTop = this.getSemicirclePoints(0, 0 - halfBound, 0 - Math.PI, halfBound);
		var line1 = this.getLinearPoints(halfBound, 0 - halfBound, Math.PI * 0.5, this.boundRadius);
		var semiCircleBottom = this.getSemicirclePoints(0, halfBound, 0, halfBound);
		var line2 = this.getLinearPoints(0 - halfBound, halfBound,(0 - Math.PI) * 0.5, this.boundRadius);
		this.boundPoints = semiCircleTop.concat(semiCircleBottom).concat(line1).concat(line2);
		this.nChecks = this.boundPoints.length;
	}

	export(){
		var object = {};
		object["X"] = Utils.intToString(this.X);
		object["Y"] = Utils.intToString(this.Y);
		object["A"] = Utils.intToString(this.A);
		object["Vx"] = Utils.intToString(this.Vx);
		object["Vy"] = Utils.intToString(this.Vy);
		object["Va"] = Utils.intToString(this.Va);
		object["hp"] = Utils.intToString(this.hp);
		object["tt"] = Utils.intToString(this.tt);
		object["complete"] = this.complete;
		object["player"] = this.player;
		object["color"] = this.color;
		object["ownedPet"] = this.ownedPet;
		object["currentTurn"] = this.currentTurn;
		object["startFireTrick"] = this.startFireTrick;
		object["gunFirePower"] = Utils.intToString(this.gunFirePower);
		object["isFacingRight"] = this.isFacingRight;
		object["isFacingLeft"] = this.isFacingLeft;
		object["isWalkingLeft"] = this.isWalkingLeft;
		object["isWalkingRight"] = this.isWalkingRight;
		object["waitingForJump"] = this.waitingForJump;
		object["jumpDirection"] = this.jumpDirection;
		object["waitingForJumpTick"] = this.waitingForJumpTick;
		object["underwater"] = this.underwater;
		object["climbing"] = this.climbing;
		object["digging"] = this.digging;
		object["superJumpTick"] = this.superJumpTick;
		object["gooTick"] = this.gooTick;
		object["moveGrappling"] = this.moveGrappling;
		return object;
	}

	step(){
	   if(this.walking && this.digging && this.parent.getGame().tick % 8 == 0){
		   this.gA = -this.trueGunAngle;
		   this.parent.getGame().field.explode(X + Math.cos(gA) * 10,Y - Math.sin(gA) * 10, this.boundRadius + 1);
	   }else this.A = 0;

	   this.totalTime += this.dt;
	   this.Vy = this.Vy + this.gravity * this.dt;

	   var averageHitG = null;

	   if(this.climbing){
		   averageHitG = this.monkeyClimb();
		   var aveBounceXG = averageHitG.sumX;
		   var aveBounceYG = averageHitG.sumY;

		   this.Vx = this.Vx + 0.001 * aveBounceXG;
		   this.Vy = this.Vy + 0.001 * aveBounceYG;
	   }

	   if(this.isWalkingLeft){
		   if(this.grappling){
		       this.Vx = this.Vx - 0.002;
		   }
		   this.Va = this.maxWalkSpeed;
	   }else if(this.isWalkingRight){
		   if(this.grappling){
		       this.Vx = this.Vx + 0.002;
		   }
		   this.Va = -this.maxWalkSpeed;
	   }else{
		   this.Va = 0;
	   }

	   if(this.climbing){
		   this.averageHit = this.parent.getGame().getCollisionAverage(this, this.climbBoundPoints, false, true, true, true);
	   }else{
		   //console.log(">> average hit -- not climbing");
		   this.averageHit = this.parent.getGame().getCollisionAverage(this, this.boundPoints, false, true, true, true);
	   }

	   var nBounce 	  = this.averageHit.nP;

	   var aveBounceX = this.averageHit.sumX;
	   var aveBounceY = this.averageHit.sumY;
	   var originalBounceY = aveBounceY;

	   if(!this.climbing){
		   var nAveBounceY = 0;
		   //if(this.parent.getGame().currentPlayer == this.parent.player.id) console.log("this.boundRadius * 0.5 = " + (this.boundRadius * 0.5)); //20
		   //if(this.parent.getGame().currentPlayer == this.parent.player.id) console.log("aveBounceY = " + aveBounceY); // 7.64331298791454
		   if(aveBounceY > this.boundRadius * 0.5){
			   nAveBounceY = aveBounceY - this.boundRadius * 0.5;
		   }else if(aveBounceY < (0 - this.boundRadius) * 0.5){
			   nAveBounceY = aveBounceY + this.boundRadius * 0.5;
		   }else{
			   nAveBounceY = 0;
		   }

		   aveBounceY = nAveBounceY;
	   }

	   //if(this.parent.getGame().currentPlayer == this.parent.player.id) console.log("new value: " + aveBounceY);

	   if(nBounce != 0){
		   //if(this.parent.getGame().currentPlayer == this.parent.player.id && this.parent.getGame().tick % 50 == 0) console.log("[" + this.parent.getGame().tick + "] Vx: " + this.Vx + " Vy: " + this.Vy + " nBounce is " + nBounce);
		   if(this.isHitBig){
			   //animation is played on the client side
			   this.isHitBig = false;
		   }

		   var r2 = aveBounceX * aveBounceX + aveBounceY * aveBounceY;
		   var r = Math.sqrt(r2);

		   if(r2 != 0 && nBounce < this.nChecks / 2){
			   var Vnormal = (aveBounceX * this.Vx + aveBounceY * this.Vy) / r;

			   if(Vnormal > 0.4){
				   if(aveBounceY > 0){
					   if(this.parent.getGame() - this.superJumpTick < 800){
						   //apply dust
					   }else{
						   var hits = this.checkAvatarFallHit();
						   //take damage of other characters
						   if(hits.length > 0){

						   }else{
							   //to be done
						   }
					   }
				   }else{
					   this.hp = this.hp - (Math.abs(Vnormal) - 0.4) * this.properties.falldmg;
				   }
			   }

			   if(this.waitingForJump && (originalBounceY > 2 || this.climbing)){
				   if(this.parent.getGame().tick - this.waitingForJumpTick < 50){
					   if(this.climbing){
						   if(averageHitG && averageHitG.nP > 0){ //fix averageHitG
							   var jumpAngle = A - Math.PI * 0.5;
							   this.Vx = this.jump * Math.cos(jumpAngle);
							   this.Vy = this.jump * Math.sin(jumpAngle);
						   }
					   }else{
						   this.Vy = 0 - this.jump;
					   }
				   }else{
					   this.waitingForJump = false;
				   }
			   }else{
				   var _local21 = (aveBounceX * this.Vy - aveBounceY * this.Vx) / r;

				   if(!this.walking && this.averageHit.nWall < this.averageHit.nP && (aveBounceY > this.boundRadius * 0.25 && Math.abs(_local21) < 0.05 && Math.abs(Vnormal) < 0.05 || this.climbing))
                   {
                      this.Vx = 0;
                      this.Vy = 0;
                      return;
                   }

				   var _local22 = Vnormal * aveBounceX / r;
				   var _local23 = Vnormal * aveBounceY / r;
				   var _local24 = this.Vx - _local22;
				   var _local25 = this.Vy - _local23;
				   var _local26 = 0;
				   if(this.climbing)
				   {
					  if(averageHitG.nP > 0)
					  {
						 _local26 = _local21 + r * Va * this.climbProperties.Vmax;
					  }
				   }
				   else if(originalBounceY > 10)
				   {
					  _local26 = _local21 + r * this.Va;
				   }
				   if(Vnormal > 0)
				   {
					  this.Vx = this.bounce * (0 - _local22) + _local24 / _local21 * _local26 * 0.5 - 0.5 * this.gravity * this.dt * aveBounceX / r;
					  this.Vy = this.bounce * (0 - _local23) + _local25 / _local21 * _local26 * 0.5;

					  //console.log("[" + this.parent.getGame().tick + "] r2 != 0 && nBounce < this.nChecks / 2 & Vx = " + this.Vx + " Vy = " + this.Vy);
				   }
			   }
		   }else if(nBounce < this.nChecks){
			   //console.log("nBounce < this.nChecks");
			   var vel = new Point(0 - aveBounceX, 0 - originalBounceY);
               vel.normalize(0.1);
               this.Vx = vel.x;
               this.Vy = vel.y;
		   }else{
			  //console.log("else{}");
			  if(this.parent.isCurrentPlayer() && this.parent.getGame().tick % this.drowningProperties.interval == 0)
			  {
				 this.hp = this.hp - this.drowningProperties.damage;
			  }
			  if(this.isWalkingRight)
			  {
				 this.Vx = 0.04;
				 this.Vy = -0.04;
			  }
			  else if(this.isWalkingLeft)
			  {
				 this.Vx = -0.04;
				 this.Vy = -0.04;
			  }
			  else
			  {
				 this.Vx = 0;
				 this.Vy = 0;
			  }
		   }
	   }
	   else if(this.underwater)
	   {
		  if(this.isWalkingLeft)
		  {
			 this.Vx = -0.1;
		  }
		  if(this.isWalkingRight)
		  {
			 this.Vx = 0.1;
		  }
		  if(this.parent.getGame().tick % 40 == 0 && this.parent.getGame().tick - this.waitingForJumpTick < 50)
		  {
			 this.Vy = -0.25;
			 this.waitingForJump = false;
		  }
	   }
	   else if(!this.climbing && !this.grappling)
	   {
		  if(this.isWalkingLeft && this.Vx > -0.07)
		  {
			this.Vx = this.Vx - 0.002;
		  }
		  if(this.isWalkingRight && this.Vx < 0.07)
		  {
			 this.Vx = this.Vx + 0.002;
		  }
	   }

	   //if(this.parent.getGame().currentPlayer == this.parent.player.id && this.parent.getGame().tick % 50 == 0)
		//	console.log("[" + this.parent.getGame().tick + "] nBounce: " + this.averageHit.nP + " vx: " + this.Vx + " vy: " + this.Vy);

	   //console.log("Vx is " + this.Vx + " Vy is " + this.Vy);
	}

	setPosition(x, y){
		this.X = x;
		this.Y = y;
	}

	move(){
		var dX = this.Vx * this.dt;
		var dY = this.Vy * this.dt;

		this.X += dX;
		this.Y += dY;

		if(this.parent.getGame().currentPlayer == this.parent.player.id && this.parent.getGame().tick % 50 == 0) console.log("[" + this.parent.getGame().tick + "] " + "X is " +  this.X + " Y is " + this.Y);

		if(dX != 0 && dY != 0){
			if(this.parent.getGame().tick % 1 == 0){
				var cmd = {
					"command" : "p",
					"i" : [this.parent.player.id, parseInt(this.X), parseInt(this.Y)]
				};

				this.parent.getGame().sendPacketE(cmd, this.parent);
			}
		}

		if(this.Y > this.parent.WOPW.config["gameHeight"] + 10)
			this.hp = 0;
		//implement water
	}

	stopWalking(){
		this.isWalkingLeft = false;
		this.isWalkingRight = false;
	}

	monkeyClimb(){
		//to implement
	}

	checkAvatarFallHit(){
		var clients = this.parent.getGame().getClients();
		var result = [];

		for(var key in clients){
			var checkObj = clients[key].avatar;
			var dY = this.Y - checkObj.Y;
			if(!(checkObj.complete || checkObj === this || dY > 0)){
				var RR1 = checkObj.boundRadius + this.boundRadius + 2;
				var RR2 = RR1 * RR1;
				var dX = this.X - checkObj.X;
				if(dX * dX + dY * dY < RR2){
					result.push(checkObj);
				}
			}
		}

		return result;
	}

	//getters - setters
	get firePower(){
		if(this.fpDistance == 0) return 0;
		var result = this.fpDistance / this.maxFPDistance;
		if(result > 1) result = 1;
		if(result < 0.01) result = 0.01;

		this.shotX = this.X;
		this.shotY = this.Y;

		return result;
	}

	get walking(){
		return this.isWalkingLeft || this.isWalkingRight;
	}

	getGunPoint(len){
		var A1 = this.isFacingRight ? this.A : (Math.PI + this.A);
		var result = {X: (this.gunX * Math.cos(A1)), Y: (this.gunX * Math.sin(A1))};
		if(len == 0) return result;
		return {X: (result.X + this.getGunTipPoint(len).X), Y: (result.Y + this.getGunTipPoint(len).Y)};
	}

	getGunTipPoint(len){
		var A2 = this.trueGunAngle;
		return {X: (len * Math.cos(A2)), Y: (len * Math.sin(A2))};
	}

	get trueGunAngle(){
		if(this.isFacingRight) return (-(this.angle) + this.A);
		else return ((Math.PI + this.angle) + this.A);
	}

	set trueGunAngle(value){
		var theta = this.A - value;

		if (theta < -(Math.PI)){
			theta = (theta + (Math.PI * 2));
		}
		if (theta > Math.PI){
			theta = (theta - (Math.PI * 2));
		}
		this.isFacingRight = (((theta < (Math.PI * 0.5))) && ((theta > (-(Math.PI) * 0.5))));
		if (!(this.isFacingRight)){
			theta = ((value - Math.PI) - this.A);
			if (theta < -(Math.PI)){
				theta = (theta + (Math.PI * 2));
			}
			if (theta > Math.PI){
				theta = (theta - (Math.PI * 2));
			}
		}

		this.angle = theta;
	}

	get climbing(){
		return this._climbing;
	}

	set climbing(value){
		this._climing = value;
	}

	get grappling(){
		return this._grappling;
	}

	set grappling(value){
		this._grappling = value;
	}
}

module.exports = Avatar;
