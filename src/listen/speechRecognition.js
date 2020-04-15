const AudioRecorder = require('node-audiorecorder');
const WitSpeech = require('node-witai-speech');

// The wit.ai instance api key
const API_KEY = process.env.WIT_API_KEY;

// The content-type for this audio stream (audio/wav, ...)
const content_type = "audio/wav";
// Stream the file to be sent to the wit.ai
// var stream = fs.createReadStream("location to your audio file.");

module.exports = async function(callback, err) {
    const audioStream = audioCapture();
    parseSpeech(audioStream).then(callback).catch(err);
};

// Its best to return a promise
const parseSpeech = function (audioStream) {return new Promise((resolve, reject) => {
    console.log("Call WIT.ai using " + audioStream + " as input");
    // call the wit.ai api with the created stream
    WitSpeech.extractSpeechIntent(API_KEY, audioStream, content_type, 
    (err, res) => {
        if (err) return reject(err);
        resolve(res);
    });
})
};


// Options is an optional parameter for the constructor call.
// If an option is not given the default value, as seen below, will be used.
const options = {
  program: `rec`,     // Which program to use, either `arecord`, `rec`, or `sox`.
  device: null,       // Recording device to use. (only for `arecord`)
 
  bits: 16,           // Sample size. (only for `rec` and `sox`)
  channels: 1,        // Channel count.
  encoding: `signed-integer`,  // Encoding type. (only for `rec` and `sox`)
  format: `S16_LE`,   // Encoding type. (only for `arecord`)
  rate: 16000,        // Sample rate.
  type: `wav`,        // Format type.
 
  // Following options only available when using `rec` or `sox`.
  silence: 3,         // Duration of silence in seconds before it stops recording.
  thresholdStart: 0.1,  // Silence threshold to start recording.
  thresholdStop: 0.3,   // Silence threshold to stop recording.
  keepSilence: true   // Keep the silence in the recording.
};


const audioCapture = function () {
    console.log('Start capturing audio');
    let audioRecorder = new AudioRecorder(options, console);
    audioRecorder.start();
    return audioRecorder.stream();
};

