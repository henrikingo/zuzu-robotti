const Friend = require('./friend.js');
const tts = require('./gcp/text-to-speech.js');
const faceRecognition = require('./aws/rekognition.js');
const assert = require('assert');
const camera = require('./camera/camera.js');

function Robot (opts) {
        assert(opts.name);
        this.name = opts.name;

        this.greetFriend = async function (friend) {
            console.log("greet");
            await tts(`Hei ${friend.name}!`);
            console.log("greet done");
        };

        this.greetStranger = async function (friend) {
            console.log("greet stranger");
            await tts(`Hei! Minun nimeni on ${this.name}. Mikä sinun nimi on?`);
            console.log("greet stranger done");
        };

        this.introduceMyself = async function () {
            console.log("intro");
            await tts(`Minun nimeni on ${this.name}.`);
            console.log("intro done");
        };

        this.wakeUp = function () {
            this.see();
        };

        this.see = function() {
            robot = this;
            camera(function(fileName){
                robot.cameraFileName = fileName;
                robot.faceRecognition();
            });
        };

        this.faceRecognition = function(){
            robot = this;
            faceRecognition(robot.cameraFileName, async function(name){
                console.log("In faceRecognition callback...");
                if ( name !== undefined ) {
                    var friend = Friend.create({name: name});
                    await robot.greetFriend(friend);
                    await robot.introduceMyself();
                }
                else {
                    await robot.greetStranger();
                }
            });
        };

        return this;
}

module.exports.create = function(opts) {
    return new Robot(opts);
};