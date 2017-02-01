var Jimp = require('jimp'),
    Utils = require('../../helpers/utils.js');

function Field(){
    this.name = "";
    this.bitmapData = "";
    this.explosionRecord = [];
}

Field.prototype = {
    //pointSet should be {x: 0, y: 0}
    //this function returns the avg collision
    checkCollisionPointSet : function(x, y, pointSet, avg){
        if(this.bitmapData){
            var nPoints = pointSet.length;
            var i = 0;
            while(i < nPoints){
                var p = pointSet[i];
                var pix = this.bitmapData.getPixelColor(p.x + x, p.y + y);
                if(pix & 4278190080){
                    avg.sumX += p.x;
                    avg.sumY += p.y;
                    avg.nP++;
                    avg.nGround++;
                }
                i++;
            }
        }
        
        return avg;
    },
    
    explode : function(x, y, r){
        if(r <= 1) return;
        this.explosionRecord.push([Utils.intToString(x), Utils.intToString(y), Utils.intToString(r)]);
        
        var di = Math.round(2 * r);
        var circle = this.getCircle(parseInt(r, 10));
        var xi = Math.round(x - r);
        var yi = Math.round(y - r);
        
        
    },
/*
        public function explode(X:Number, Y:Number, R:Number):void{
            if (R <= 1){
                return;
            };
            explosionRecord.push([MathUtil.number2String(X), MathUtil.number2String(Y), MathUtil.number2String(R)]);
            var Di:Number = Math.round((2 * R));
            var circle:BitmapData = getCircle(uint(R));
            var Xi:Number = Math.round((X - R));
            var Yi:Number = Math.round((Y - R));
            var coppyRect:Rectangle = new Rectangle(Xi, Yi, Di, Di);
            var coppyPoint:Point = new Point(Xi, Yi);
            bitmapData.copyPixels(bitmapData, coppyRect, coppyPoint, circle, new Point(), false);
            var circleMask:Shape = new Shape();
            var g:Graphics = circleMask.graphics;
            g.beginFill(Battlefield.main.skyColor);
            g.drawCircle(X, Y, R);
            circleMask.blendMode = (isHighQuality) ? BlendMode.ERASE : BlendMode.NORMAL;
            addChild(circleMask);
            explosionMasks.push(circleMask);
        }*/

    getCircle : function(rad){
        var dia = 2 * rad;  // diameter = rad * 2
        var rr = rad * rad; //radius squared

        var result = new Jimp(dia, dia, 0x00000000);

        var i = 0;
        while(i < dia){
            var dx = (i - rad);
            var dx2 = (dx * dx);
            var j = 0;
            while(j < dia){
                var dy = (j - rad);
                var dy2 = (dy * dy);
                if(dx2 + dy2 > rr){
                    result.setPixelColor(0xFFFFFFFF, i, j);
                }
                j++;
            }
            i++;
        }

        return result;
    }
};

module.exports = Field;