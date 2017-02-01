"use strict";
/**
 * Created by drw on 9/26/16.
 */
class Physical{
    constructor(){
        this.base_gravity = 0.0005;
        this.boundPoints = [{X: 0, Y:0}];
        this.bounce = 0.001;
        this.boundRadius2 = 625;

        this.dt = 10;
        this.groundFriction = 0.015;
        this.waterR = 0.0012;
        this.totalTime = 0;
        this.timeToLive = -1;
        this.checkRadius = 0; //number
        this.boundRadius = 25;
        this.A = 0;
        this.markerColor = 0xFF0000;
        this.windR = 0.0001;
        this.Va = 0;
        this.gravity = this.base_gravity;
        this._type = "unknown";

        this.radiansToDegrees = 57.2957795130823;
        this.lineNumber = 0;
        this.healthPoints = 0;
        this.Vx = 0;
        this.Vy = 0;
        this.X = 0;
        this.Y = 0;

        this.markerRadius = 1;
        this.nChecks = 0;
        this.complete = false;
    }

    get dt(){
        return this._dt;
    }

    set dt(value){
        this._dt = value;
    }

    get type(){
        return this._type;
    }

    set type(value){
        this._type = value;
    }

    get hp(){
        return this.healthPoints;
    }

    set hp(value){
        this.healthPoints = value;
    }

    checkCollision(_X, _Y){
        var dX = (_X - this.X);
        var dY = (_Y - this.Y);
        return ((((dX * dX) + (dY * dY)) < (this.boundRadius * this.boundRadius)));
    }

    onFrame(){
        var newAngle = (A * this.radiansToDegrees);
        if (Math.abs((newAngle - this.rotation)) > 0.1){
            this.rotation = newAngle;
        }
    }

    getLinearPoints(X, Y, A, L){
        var i = 0;
        var result = [];
        var Xi = X;
        var Yi = Y;
        var dX = Math.cos(A);
        var dY = Math.sin(A);

        while (i < L) {
            result.push({X: Xi, Y:Yi});
            Xi = (Xi + dX);
            Yi = (Yi + dY);
            i++;
        };
        return (result);
    }

    getSemicirclePoints(X, Y, A, R){
        var i = 0;
        var Xi;
        var Yi;
        var nPoints = Math.abs(parseInt(Math.PI * R));
        var result = [];
        var dA = (1 / R);
        var angle = A;

        while (i < nPoints) {
            Xi = (X + (R * Math.cos(angle)));
            Yi = (Y + (R * Math.sin(angle)));
            result.push({X: Xi, Y:Yi});
            angle = (angle + dA);
            i++;
        };
        return (result);
    }

    getEllipticalPoints(Rx, Ry){
        var i;
        var result = [];
        var angle = 0;
        while (angle < (Math.PI * 2)) {
            result.push({X: (Rx * Math.cos(angle)), Y:(Ry * Math.sin(angle))});
            angle = (angle + (1 / Math.sqrt(((Rx * Rx) + (Ry * Ry)))));
        };
        return (result);
    }

    getRectangularPoints(W, H){
        var Xi = 0;
        var Yi = 0;
        var result = [];
        Xi = (-(W) * 0.5);
        Yi = (-(H) * 0.5);
        while (Yi <= (H * 0.5)) {
            result.push({X: Xi, Y:Yi});
            Yi++;
            this.nChecks++;
        };
        Xi = (W * 0.5);
        Yi = (-(H) * 0.5);
        while (Yi <= (H * 0.5)) {
            result.push({X: Xi, Y:Yi});
            Yi++;
            this.nChecks++;
        };
        Xi = ((-(W) * 0.5) + 1);
        Yi = (-(H) * 0.5);
        while (Xi < (W * 0.5)) {
            result.push({X: Xi, Y:Yi});
            Xi++;
            this.nChecks++;
        };
        Xi = ((-(W) * 0.5) + 1);
        Yi = (H * 0.5);
        while (Xi < (W * 0.5)) {
            result.push({X: Xi, Y:Yi});
            Xi++;
            this.nChecks++;
        };
        return (result);
    }

    getCircularPoints(R){

        var Xi = 0;
        var Yi = 0;
        var nPoints = (((Math.PI * R) * 2));
        if (nPoints <= 1){
            return ([{X: 0, Y:0}]);
        };
        var result = [];
        var dA = ((Math.PI * 2) / (nPoints));
        var angle = 0;
        var i = 0;

        while (i < nPoints) {
            Xi = (R * Math.cos(angle));
            Yi = (R * Math.sin(angle));
            result.push({X: (R * Math.cos(angle)), Y:(R * Math.sin(angle))});
            angle = (angle + dA);
            i++;
        };

        return (result);
    }
}

module.exports = Physical;
