function MapProperties(){
      this.mines = 3;
      this.minePos = [];;
      this.wind = 0.0;
      this.name = "No Name";
      this.waterAlpha = 0.5;
      this.midHeight = -1.0;
      this.crates = 3;
      this.cratePos = [];
      this.waterColor = 21845;
      this.currency = "gold";
      this.backScale = 1.0;
      this.height = 1200.0;
      this.background = "No Background";
      this.players = 6;
      this.updated = false;
      this.backColor = 37324;
      this.foreground = "No Foreground";
      this.width = 1600.0;
      this._price = 6;
      this.midground = "No Midground";
      this.thumb = "";
      this.preview = "";
      this.waterHighlight = 16777215;
      this.midWidth = -1.0;
      this.disaster = "flood";
      this.ambientLoop = "";
      this.max = 6;
      this.positions = [];
      this.mask = "No Mask";
      this.ambientRandom = [];;


      this.positions = [[100,1000,1500,1000]];
      this.minePos = [[100,1000,1500,1000]];
      this.cratePos = [[100,1000,1500,1000]];
      this.ambientRandom = [];
}

MapProperties.prototype = {
    set price (value){
        this._price = value;
    },

    get price (){
        return this._price;
    }
}

module.exports = MapProperties;
