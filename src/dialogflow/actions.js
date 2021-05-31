const Friend = require('../friend.js');


function DialogFlowActions(robot) {
    this.robot = robot;

    this.action = function(queryResult) {
        if (! (queryResult.intent && queryResult.allRequiredParamsPresent) )
            return null;

        if (queryResult.action && typeof this[queryResult.action] == "function")
            this[queryResult.action](queryResult);
    };

    this._getName = function(queryResult) {
        // Custom intents end up putting the name in different path depending on whether it was detected
        // in sys.person or in the list of custom names.
        if (queryResult.parameters && queryResult.parameters.fields && queryResult.parameters.fields.customName && queryResult.parameters.fields.customName.stringValue)
            return queryResult.parameters.fields.customName.stringValue;

        if (queryResult.parameters &&
            queryResult.parameters.fields &&
            queryResult.parameters.fields.customName &&
            queryResult.parameters.fields.customName.structValue &&
            queryResult.parameters.fields.customName.structValue.fields &&
            queryResult.parameters.fields.customName.structValue.fields.name &&
            queryResult.parameters.fields.customName.structValue.fields.name.stringValue
        )
            return queryResult.parameters.fields.customName.structValue.fields.name.stringValue;
    };

    this.strangerName = function(queryResult) {
        console.log(`  Intent: ${queryResult.intent.displayName}`);
        let name = this._getName(queryResult);
        if (name) {
            // Save new face in Rekognition service
            this.robot.addFriend(Friend.create({name: name, dfParams: queryResult.parameters}));
        } else {
            console.log('  Name not found in result. I think this shouldn\'t happen???');
            console.log(queryResult);
        }

    };

    this.shutdown = function() {
        robot.say("Shutdown command received. But it doesn't work yet.");
    };

    this.addNewFriend = function(queryResult) {
        console.log(`  Intent: ${queryResult.intent.displayName}`);
        let name = this._getName(queryResult);
        if (name) {
            // Save new face in Rekognition service
            this.robot.addFriend(Friend.create({name: name, dfParams: queryResult.parameters}));
        } else {
            console.log('  Name not found in result. I think this shouldn\'t happen???');
            console.log(queryResult);
        }
    };

    console.log("Creating DialogFlowActions instance");
    return this;
};

module.exports = DialogFlowActions;
