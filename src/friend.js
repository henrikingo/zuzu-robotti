const assert = require('assert');

function Friend (opts) {
        assert(opts.name);
        this.name = opts.name;
        return this;
}

module.exports.create = function(opts) {
    return new Friend(opts);
};