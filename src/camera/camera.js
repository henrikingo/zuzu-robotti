const NodeWebcam = require('node-webcam');
var opts = {
    //Picture related
    width: 1280,
    height: 720,
    quality: 100,
    //Delay in seconds to take shot
    delay: 0,
    //On my webcam first frames are black, so skip a few
    frames: 10,
    skipFrames: 7,
    //Save shots in memory
    saveShots: true,
    // [jpeg, png] support varies
    // Webcam.OutputTypes
    output: "jpeg",
    //Which camera to use
    //Use Webcam.list() for results
    //false for default device
    device: false,
    // [location, buffer, base64]
    // Webcam.CallbackReturnTypes
    callbackReturn: "location",
    //Logging
    verbose: true
};
//Creates webcam instance
var Webcam = NodeWebcam.create( opts );

module.exports = function (done) {
    photo(done);
}

const photo = function (callback) {
    //Will automatically append location output type
    console.log("take photo...");
    Webcam.capture( "zuzu-camera", function( err, data ) {
        if (err) {
            console.log(err, err.stack);
        }
        else {
            //console.log(data);
            callback(data);
        }
    } );
    console.log("end of photo");
};