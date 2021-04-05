const assert = require('assert');

function Friend (opts) {
        console.log(JSON.stringify(opts));
        assert(opts.name);
        this.name = opts.name;
        if(opts.dfParams)
            this.dfParams = opts.dfParams;
        return this;
}

module.exports.create = function(opts) {
    return new Friend(opts);
};
