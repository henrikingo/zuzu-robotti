// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const player = require('play-sound')(opts = {})

// Import other required libraries
const fs = require('fs');
const util = require('util');

// Depends on enabling text-to-speech and setting GOOGLE_APPLICATION_CREDENTIALS as explained at
// https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries#client-libraries-install-nodejs
async function main() {
  // Creates a client
  const client = new textToSpeech.TextToSpeechClient();

  // The text to synthesize
  const text = 'Hei Ebba!';

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
  const writeFile = util.promisify(fs.writeFile);
  await writeFile('output.mp3', response.audioContent, 'binary');
  console.log('Audio content written to file: output.mp3');

  // $ mplayer foo.mp3 
  player.play('output.mp3', function(err){
    if (err) throw err
  })
}
main();