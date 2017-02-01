var Jimp  = require('jimp');
var fs    = require('fs');
var Utils = require('./helpers/utils.js');

function Field(slot){
    this.flag = "kt";
    this.slot = slot;
    this.bitmapUrl = "http://beta.wildones.pw/images/r1_kitchen-A/kt_mask.png";
    this.bitmapData = undefined;
    this.explosionRecord = [];
    this.width = 2800;
    this.height = 1400;

    //console.log("loading image..");
    /*Jimp.read(this.bitmapUrl, function(err, image) {
        if(!err){
            console.log("loaded image!");
            this.bitmapData = image;
        }else{
            console.log("!! image loading error: " + err);
        }
        /* var pixelValue = image.getPixelColor(2300, 50);

            var red = pixelValue >> 24 & 0xFF;
            var green = pixelValue >> 16 & 0xFF;
            var blue = pixelValue >> 8 & 0xFF;
            var alpha = pixelValue & 0xFF;

            console.log("pixel color red:" + red + " green: " + green + " blue: " + blue + " alpha: " + alpha);//
            //pixelValue = image.getPixelColor(1200, 1000);
            //console.log("pixel color of 50 50 is " + (pixelValue & 4278190080));//


    }.bind(this));*/
}

Field.prototype = {
    checkFieldCollisionPoint : function(x, y){
        try {
            //x = parseInt(x);
            //y = parseInt(y);
            if(x < 0 || y < 0) return false;
            return Boolean(this.getFieldPointColor(x, y) & 0xff000000);
        }catch(e){
            console.log(e);
        }
    },

    getFieldPointColor : function(x, y){
        try {
            return this.bitmapData.getPixelColor(x, y);
        }catch(e){
            return 0;
        }
    },

    /*  public function checkCollisionPointSet(X:Number, Y:Number, pointSet:Array, avg:CollisionAverage) : void
      {
         var p:Point = null;
         var nPoints:uint = 0;
         var pix:int = 0;
         var i:uint = 0;
         if(bitmapData)
         {
            for(nPoints = pointSet.length; i < nPoints; )
            {
               p = pointSet[i];
               pix = bitmapData.getPixel32(int(p.x + X),int(p.y + Y));
               if(pix & 4278190080)
               {
                  avg.sumX = avg.sumX + p.x;
                  avg.sumY = avg.sumY + p.y;
                  avg.nP++;
                  avg.nGround++;
               }
               i++;
            }
         }
      }
      */
    checkCollisionPointSet : function(x, y, pointSet, avg){
        if(this.bitmapData){
            //var nPoints = pointSet.length
            //console.log("checking collision point set");
            for(var i = 0; i < pointSet.length; i++){
                var p = pointSet[i];
                if(p.X + x < 0 || p.Y + y < 0) continue;
                //oolean(this.bitmapData.getPixelColor(x, y) & 0xff000000);
                var pix = this.getFieldPointColor(p.X + x, p.Y + y);
                //console.log("got pixel value!");
                if(pix & 4278190080){
                    //console.log("got collision!\n\n");
                    avg.sumX += p.X;
                    avg.sumY += p.Y;
                    avg.nP++;
                    avg.nGround++;
                }
            }


        }else{
            console.log("!!! bitmapData is null");
        }

        return avg;
    },
     /*
      public function explode(X:Number, Y:Number, R:Number) : void
      {
         if(R <= 1)
         {
            return;
         }
         explosionRecord.push([MathUtil.number2String(X),MathUtil.number2String(Y),MathUtil.number2String(R)]);
         var Di:Number = Math.round(2 * R);
         var circle:BitmapData = getCircle(uint(R));
         var Xi:Number = Math.round(X - R);
         var Yi:Number = Math.round(Y - R);
         var coppyRect:Rectangle = new Rectangle(Xi,Yi,Di,Di);
         var coppyPoint:Point = new Point(Xi,Yi);
         bitmapData.copyPixels(bitmapData,coppyRect,coppyPoint,circle,new Point(),false);
         var circleMask:Shape = new Shape();
         var g:Graphics = circleMask.graphics;
         g.beginFill(Battlefield.main.skyColor);
         g.drawCircle(X,Y,R);
         circleMask.blendMode = !!isHighQuality?BlendMode.ERASE:BlendMode.NORMAL;
         addChild(circleMask);
         explosionMasks.push(circleMask);
      }*/

    explode : function(x, y, r){
        if(r <= 1) return;
        this.explosionRecord.push([Utils.intToString(x), Utils.intToString(y), Utils.intToString(r)]); //convert these to string
    }
};

module.exports = Field;
