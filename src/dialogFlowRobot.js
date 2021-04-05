const i18n = require('i18n');

const Friend = require('./friend.js');
const tts = require('./gcp/text-to-speech.js');
const faceRecognition = require('./aws/rekognition.js');
const assert = require('assert');
const camera = require('./camera/camera.js');
//const speechRecognition = require('./listen/speechRecognition.js')
const dialogflow = require('./dialogflow/engine.js');

function DialogFlowRobot (opts) {
        assert(opts.name);
        this.name = opts.name;
        this.dialogflow = dialogflow.create(this);

        this.wakeUp = function () {
            console.log("Robot wake up. Open your eyes, look around.");
            this.see(this.mainLoop);
        };

        const robot = this;
        this.mainLoop = function () {
            console.log("Top of main loop.");
            setTimeout(robot.mainLoop, 5000);
        };

        this.see = function(callback) {
            camera(function(fileName){
                robot.cameraFileName = fileName;
                robot.faceRecognition(callback);
            });
        };

        this.faceRecognition = function(callback){
            faceRecognition.search(robot.cameraFileName, async function(result){
                console.log("In faceRecognition callback...");
                if ( result.status == "OK" ) {
                    this.friend = Friend.create({name: result.name});
                    const friendContext = robot.dialogflow.addContext("friend", robot.dialogflow.formatCustomName(result.name));
                    robot.dialogflow.event("friend", friendContext.parameters);
                }
                else if (result.status == "UNKNOWN FACE") {
                    await robot.dialogflow.addContext("stranger");
                    await robot.dialogflow.event("stranger");
                    await robot.dialogflow.streamIntent();
                }
                else if (result.status == "NO FACE" ) {
                    await robot.dialogflow.event("noface");
                }
                callback();
            });
        };

        // Save new face in Rekognition service
        this.addFriend = function (friend) {
            faceRecognition.add(friend);
            this.friend = friend;
        };

        return this;
}

module.exports.create = function(opts) {
    return new DialogFlowRobot(opts);
};
