const tts = require('./gcp/text-to-speech.js');
const assert = require('assert');

function Robot (opts) {
        assert(opts.name);
        this.name = opts.name;

        this.greet = async function (friend) {
            await tts(`Hei ${friend.name}!`);
        };

        this.introduce_myself = async function () {
            await tts(`Minun nimeni on ${this.name}.`);
        };

        return this;
}

module.exports.create = function(opts) {
    return new Robot(opts);
};