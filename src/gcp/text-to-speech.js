// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const player = require('./play-sound-sync')(opts = {})

// Import other required libraries
var tmp = require('tmp');
const fs = require('fs');
const util = require('util');

// Depends on enabling text-to-speech and setting GOOGLE_APPLICATION_CREDENTIALS as explained at
// https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries#client-libraries-install-nodejs
module.exports = async function (text) {
  // Creates a client
  const client = new textToSpeech.TextToSpeechClient();

  // Construct the request
  const request = {
    input: {text: text},
    // Select the language and SSML Voice Gender (optional)
    voice: {languageCode: 'fi-FI', ssmlGender: 'FEMALE'},
    // Select the type of audio encoding
    audioConfig: {audioEncoding: 'MP3'},
  };

  // Performs the Text-to-Speech request
  const [response] = await client.synthesizeSpeech(request);
  // Write the binary audio content to a local file
  var tmpfile = tmp.fileSync({ mode: 0600, prefix: 'zuzu-', postfix: '.mp3' });
  const writeFile = util.promisify(fs.writeFile);
  await writeFile(tmpfile.name, response.audioContent, 'binary');

  // $ mplayer foo.mp3 
  await player.play(tmpfile.name, function(err){
    tmpfile.removeCallback();
    if (err) throw err
  });
  
}
