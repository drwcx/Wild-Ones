function WeaponProperties(){
    this.size = 10;
    this.description = "Weapon";
    this.dispersion = 0.15;
    this.bounce = 0.5;
    this.hp = 100;
    this.currency = "gold";
    this.timeAfter = 4000;
    this.R1 = 60;
    this.R2 = 100;
    this.instructions = "No Instructions";
    this.alt = "";
    this.projectiles = 1;
    this.baseType = "null";
    this.par1 = 1;
    this.offense = "";
    this.tip = "";

    this.purchaseAmount = 1;
    this.type = "null";
    this.petWeapon = false;
    this.par3 = 1;
    this.interval = 10;
    this.defense = "";
    this.featuredEndDate = "";
    this.par2 = 1;
    this.windR = 0.0001;
    this.Vmax = 1.5;
    this.clip = 1;
    this._price = 0;
    this.gravity = 0.0005;
    this.Rdirt = 60;
    this.dropTime = 1000;
    this.timeout = -1;
    this.Vinit = 0;
    this.deploy = "gun";
    this.instant = false;
    this.sticky = false;
    this.expireDate = "";
    this.damage = 100;
    this.live = 1;
    this.impulse = 0.001;
    this.childType = "null";
    this.initAmmo = 5;
    this.children = 0;
};

WeaponProperties.prototype = {
    set price(value){
        this._price = value;
    },

    get price(){
        return this._price;
    }
};

module.exports = WeaponProperties;
