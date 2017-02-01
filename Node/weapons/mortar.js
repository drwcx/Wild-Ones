/**
 * Created by drw on 10/6/16.
 * Note: this is still experimental. It might blow your foot off.
 */
 
var Physical = require("../physics/physical.js");

function Mortar(properties, x, y, vx, vy, slot) {
    Physical.apply(this);
    this.properties = properties;
    this.X = x;
    this.Y = y;
    this.Vx = vx;
    this.Vy = vy;
    console.log("boundradius " + this.boundRadius);
    console.log(this.windR);
    console.log("Launched mortar with X: " + this.X + " Y: " + this.Y + " Vx: " + this.Vx + " Vy: " + this.Vy);
    this.slot = slot;
}

Mortar.prototype = new Physical();

Mortar.prototype = {
    step : function() {
        /*            var inWater:Boolean;
         totalTime = (totalTime + dt);
         var averageHit:CollisionAverage = main.getCollisionAverage(this, boundPoints);
         var nBounce:Number = averageHit.nP;
         if (nBounce != 0){
         complete = true;
         return;
         };
         inWater = ((main.water) && ((main.water.Y < Y)));
         //(((timeLoop.WVx - Vx)    * dt) * windR)
         Vx = (Vx + (inWater) ? ((-(Vx) * dt) * waterR) : (((timeLoop.WVx - Vx)    * dt) * windR));
         Vy = (Vy + (inWater) ? ((gravity - (Vy * waterR)) * dt) : ((gravity + ((timeLoop.WVy - Vy) * windR)) * dt));*/

        var averageHit = this.slot.getCollisionAverage(this, this.boundPoints);

        this.Vx += (-this.Vx) * this.dt * this.windR;
        this.Vy = this.Vy + (this.gravity + (0 - this.Vy) * this.windR) * this.dt;

        if(averageHit.nP != 0){
            console.log("projectile hit something!");
            this.move();
            this.onComplete();
            return;
        }else{
            console.log("projectile did not hit! X: " + this.X + " Y: " + this.Y + " Vx: " + this.Vx + " Vy: " + this.Vy + " WindR " +  this.windR + " gravity " + this.gravity + " dt " + this.dt);
        }
    }
    ,

    move : function() {
        /*
         var dY:Number = NaN;
         var dX:Number = Vx * dt;
         dY = Vy * dt;
         X = X + dX;
         Y = Y + dY;
         if(Y > Battlefield.gameHeight + 200)
         {
         if(source.isClient)
         {
         GameNewsFeed.setTrigger(GameNewsFeed.EPIC_MISS);
         }
         complete = true;
         }
         */
        var dY = this.Vy * this.dt;
        var dX = this.Vx * this.dt;
        //gpx gpy -21.313257408913966-39.63262618880275
        //gpx gpy -21.313257408913966 -39.63262618880275
        this.X += dX;
        this.Y += dY;

        if(this.X < -10000 || this.Y < -10000) this.onComplete();


        if (this.Y > 1700) {
            this.onComplete();
        }
    },

    onComplete : function () {
        this.complete = true;
        console.log("Mortar exploded at " + this.X + " " + this.Y);
        this.slot.field.explode(this.X, this.Y, this.properties.Rdirt); //this should be expanded
    }
};

module.exports = Mortar;
