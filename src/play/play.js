const player = require('./play-sound-sync')(opts = {})
// Import other required libraries
var tmp = require('tmp');
const fs = require('fs');
const util = require('util');




module.exports = async function (audioBuffer, callback) {
    console.log(audioBuffer);
    // Write the binary audio content to a local file
    var tmpfile = tmp.fileSync({ mode: 0600, prefix: 'zuzu-', postfix: '.mp3' });
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(tmpfile.name, audioBuffer, 'binary');

    // $ mplayer foo.mp3 
    await player.play(tmpfile.name, function(err){
        tmpfile.removeCallback();
        if (err) throw err
  });
  if (typeof callback == "function") callback();
};
