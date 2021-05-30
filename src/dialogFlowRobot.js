const i18n = require('i18n');

const Friend = require('./friend.js');
const tts = require('./gcp/text-to-speech.js');
const play = require('./play/play');
const faceRecognition = require('./aws/rekognition.js');
const assert = require('assert');
const camera = require('./camera/camera.js');
//const speechRecognition = require('./listen/speechRecognition.js')
const dialogflow = require('./dialogflow/engine.js');

function DialogFlowRobot (opts) {
        assert(opts.name);
        this.name = opts.name;
        this.dialogflow = dialogflow.create(this, opts.config);
        const robot = this;

        this.wakeUp = function () {
            console.log("Robot wake up. Open your eyes, look around.");
            this.see(function() {
                // Use setTimeout to get out of callback hell before mainLoop
                setTimeout(robot.mainLoop, 1);
            });
        };

        this.mainLoop = function () {
//             console.log("Top of main loop.");
            robot.reallySayThings();
            robot.listen();
            setTimeout(robot.mainLoop, 100);
        };

        this.see = function(callback) {
            camera(function(fileName){
                robot.cameraFileName = fileName;
                robot.faceRecognition(callback);
            });
        };

        this._listening = false;
        this._speaking = false;
        this.listen = function() {
            if ( !robot._listening && !robot._speaking && !robot._sayQueue.length ) {
                console.log("Opening new stream to DialogFlow. You can speak anything you want.");
                robot._listening = true;
                robot.dialogflow.streamIntent(null, function () {
                    robot._listening = false;
                    console.log("Closed stream to DialogFlow.");
                });
            }
            else {
//                 console.log("Need to wait before listening, some other thread still speaking.");
            }
        };

        this._sayQueue = [];
        this.say = function (text) {
            this._sayQueue.push({"text": text, "type": "text"});
        };
        this.play = function (audio) {
            this._sayQueue.push({"audio": audio, "type": "audio"});
        };

        this.reallySayThings = function() {
            if ( ! (this._listening || this._speaking) ) {
                if (this._sayQueue) {
                    const whatToSay = this._sayQueue.shift();
                    if (whatToSay && whatToSay.type == "text") {
                        console.log("Play text: " + whatToSay.text);
                        this._speaking = true;
                        tts(whatToSay.text, opts.config.gcp.tts_options, function() {
                            robot._speaking = false;
                        });
                    }
                    else if (whatToSay && whatToSay.type == "audio" ) {
                        console.log("Play audio buffer.");
                        this._speaking = true;
                        play(whatToSay.audio, function () {
                            robot._speaking = false;
                        });
                    }
                }
            }
            else {
//                 console.log("Need to wait to say next thing, some other thread is still saying or listening.");
            }
        };

        this.faceRecognition = function(callback){
            faceRecognition.search(robot.cameraFileName, async function(result){
                console.log("In faceRecognition callback...");
                // This plays the first prompt uttered by the robot
                if ( result.status == "OK" ) {
                    this.friend = Friend.create({name: result.name});
                    const friendContext = robot.dialogflow.addContext("friend", robot.dialogflow.formatCustomName(result.name));
                    await robot.dialogflow.event("friend", friendContext.parameters);
                }
                else if (result.status == "UNKNOWN FACE") {
                    await robot.dialogflow.addContext("stranger");
                    await robot.dialogflow.event("stranger");
                }
                else if (result.status == "NO FACE" ) {
                    await robot.dialogflow.event("noface");
                }
                callback();
            });
        };

        // Save new face in Rekognition service
        this.addFriend = function (friend) {
            faceRecognition.add(friend, opts.config.aws);
            this.friend = friend;
        };

        return this;
}

module.exports.create = function(opts) {
    return new DialogFlowRobot(opts);
};
