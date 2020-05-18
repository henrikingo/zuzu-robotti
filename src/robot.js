const Friend = require('./friend.js');
const tts = require('./gcp/text-to-speech.js');
const faceRecognition = require('./aws/rekognition.js');
const assert = require('assert');
const camera = require('./camera/camera.js');
const speechRecognition = require('./listen/speechRecognition.js')

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
            await this.listen();
        };

        this.introduceMyself = async function () {
            console.log("intro");
            await tts(`Minun nimeni on ${this.name}.`);
            console.log("intro done");
        };

        this.alone = async function () {
            console.log("alone");
            await tts(`Eihän täällä ole ketään.`);
            console.log("alone done");
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
            const robot = this;
            faceRecognition.search(robot.cameraFileName, async function(result){
                console.log("In faceRecognition callback...");
                if ( result.status == "OK" ) {
                    const friend = Friend.create({name: result.name});
                    await robot.greetFriend(friend);
                    await robot.introduceMyself();
                }
                else if (result.status == "UNKNOWN FACE") {
                    await robot.greetStranger();
                }
                else if (result.status == "NO FACE" ) {
                     await robot.alone();
                }
            });
        };

        this.listen = async function () {
            const robot = this;
            const listenCallback = async function (res) {
                console.log("processListen()");
                console.log(res);
                if ( res.entities.contact ) {
                    console.log(res.entities.contact[0]);
                    const friend = Friend.create({name: res.entities.contact[0].value});
                    faceRecognition.add(friend, async function() {
                        await robot.greetFriend(friend);
                    })
                }
                else {
                    await tts("Hymm... Nyt en kyllä saanut nimestä selvää. Ei se mitään. Yritä uudestaan.");
                }
            };
            await speechRecognition(listenCallback, (err) => console.log(err));
            console.log("Started listen()ing. I'm done. Callback will handle things after you finish talking.");
        };


        return this;
}

module.exports.create = function(opts) {
    return new Robot(opts);
};