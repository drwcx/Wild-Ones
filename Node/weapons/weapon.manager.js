/**
 * Created by drw on 10/6/16.
 */
var Mortar = require('./mortar.js');

function Weapon(slot) {
    this.slot = slot;
}

Weapon.prototype = {
    makeWeapon : function(name, properties, x, y, vx, vy){
       /* switch(type){
            case "mortar":
                return new Mortar(x, y, vx, vy, this.slot);
       }*/
       
       switch(name){
       		case "mortar":
       		case "nuke":
       		case "meganuke":
       		case "gonuke":
       		case "babynuke":
       			 return new Mortar(properties, x, y, vx, vy, this.slot);
       } 
    }
};

module.exports = Weapon;