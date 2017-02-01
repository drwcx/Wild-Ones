function AccessoriesProperties() {
    this.type = "unknown";
    this.rep_currency = "treats";
    this.sell_value = 0;
    this.durability = -1;
    this._price = 100;
    this.currency = "gold";
    this._rep_cost = 0;
    this.pos = {};
    this.sell_currency = "treats";
    this.stats = {};
    this.alt = "unknown";
    this.featuredEndDate = "";
    this.expireDate = "";
    this.tip = "default accessory";
    this.startDate = "";
    this.z = -1;
    this.category = ""
}

AccessoriesProperties.prototype = {
    set price (value){
        this._price = value;
    },

    get price (){
        return this._price;
    },

    set rep_cost(value){
        this._rep_cost = value;
    },

    get rep_cost(){
        return this._rep_cost;
    }
};

module.exports = AccessoriesProperties;
