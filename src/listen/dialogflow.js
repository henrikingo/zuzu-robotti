const AudioRecorder = require('node-audiorecorder');
const util = require('util');
const {Transform, pipeline} = require('stream');

const pump = util.promisify(pipeline);
// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');

// Record audio into file - non blocking

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

module.exports = async function(callback, err) {
    const audioStream = audioCapture();
    greetStrangerIntent(audioStream, callback, err);
}



// The rest is dialogflow code from
// https://cloud.google.com/dialogflow/es/docs/how/detect-intent-stream

// The path to the local file on which to perform speech recognition, e.g.
// /path/to/audio.raw const filename = '/path/to/audio.raw';

// The encoding of the audio file, e.g. 'AUDIO_ENCODING_LINEAR_16'
// const encoding = 'AUDIO_ENCODING_LINEAR_16';

// The sample rate of the audio file in hertz, e.g. 16000
// const sampleRateHertz = 16000;

// The BCP-47 language code to use, e.g. 'en-US'
// const languageCode = 'en-US';
// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();
const sessionId = Math.random().toString();

const sessionPath = sessionClient.projectAgentSessionPath(
  'zuzu-robotti', // projectId
  sessionId
);

const initialStreamRequest = {
  session: sessionPath,
  queryParams: {
    session: sessionPath,
  },
  queryInput: {
    audioConfig: {
      audioEncoding: options.encoding,
      sampleRateHertz: options.rate,
      languageCode: 'en-US',
    },
    singleUtterance: true,
  },
};

const greetStrangerIntent = async function (audioStream, resolve, reject) {
    console.log("Call DialogFlow using " + audioStream + " as input");
    // Create a stream for the streaming request.
    const detectStream = sessionClient
    .streamingDetectIntent()
    .on('error', reject)
    .on('data', resolve)
    .on('end', () => {console.log('end of audio streaming');});

    // Write the initial stream request to config for audio input.
    detectStream.write(initialStreamRequest);
    await pump(
        audioStream,
        // Format the audio stream into the request format.
        new Transform({
            objectMode: true,
            transform: (obj, _, next) => {
            next(null, {inputAudio: obj});
            },
        }),
        detectStream
    );
};


