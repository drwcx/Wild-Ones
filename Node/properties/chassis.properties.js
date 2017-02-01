function ChassisProperties(){
    this.size = 40.0;
    this.bounce = 0.2;
    this.hp = 900.0;
    this.currency = "gold";
    this.falldmg = 200.0;
    this.petPower = "";
    this.bottomsXY = [];
    this.offense = "";
    this.jump = 0.25;
    this.color2 = 0;
    this.alt = "Body";
    this.color1 = 0;
    this.type = "unknown";
    this.tip = "Body";
    this.topsXY = [];
    this.defense = "";
    this.speed = 0.004;
    this._price = 1234321;
    this.gravity = 5.0E-4;
    this.scale = 1.0;
    this.headsXY = [];
    this.miscXY = [];
    this.impulse = 1.0;
    this.description = "Body";
    this.topsXY = [0,0,0,1,1];
    this.bottomsXY = [0,0,0,1,1];
    this.headsXY = [0,0,0,1,1];
    this.miscXY = [0,0,0,1,1];
}

ChassisProperties.prototype = {
    set price(value){
        this._price = value;
    },

    get price(){
        return this._price;
    }
};

module.exports = ChassisProperties;
