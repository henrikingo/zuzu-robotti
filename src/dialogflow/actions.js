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

    this.lastSeen = function(queryResult) {
        console.log(`  Intent: ${queryResult.intent.displayName}`);
        let name = this._getName(queryResult);
        if (name) {
            const memoryEvent = this.robot.memory.lastSeen(name);
            this._lastSeen(name, this.robot.memory.lastSeen(name));
        } else {
            console.log('  Name not found in result. I think this shouldn\'t happen???');
            console.log(queryResult);
            console.log(JSON.stringify(queryResult.parameters.fields));
        }
    };

    this._lastSeen = function(name, memoryEvent) {
        if(memoryEvent){
            const ago = this._ago(memoryEvent.time);
            if (memoryEvent.friend){
                this.robot.say(`Yes, I saw them ${ago.str}.`);
            }
            else{
                this.robot.say(`Yes, I saw ${memoryEvent.name} ${ago.str}.`);
            }
        }
        else{
            this.robot.say(`No, I'm sorry, but I don't remember seeing ${name}.`);
        }
    };

    this._ago = function(then){
        let seconds = (new Date() - then)/1000;
        console.log(`${then} is ${seconds} ago.`);
        let toReturn = {};
        toReturn.str = "";
        toReturn.years = Math.floor(seconds / (365*24*60*60));
        seconds = seconds % (365*24*60*60);
        toReturn.months = Math.floor(seconds / (30*24*60*60));
        seconds = seconds % (30*24*60*60);
        toReturn.days = Math.floor(seconds / (24*60*60));
        seconds = seconds % (24*60*60);
        toReturn.hours = Math.floor(seconds / (60*60));
        seconds = seconds % (60*60);
        toReturn.minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        toReturn.seconds = Math.floor(seconds);
        if(toReturn.years>0){
            const unit = toReturn.years > 1 ? "years" : "year";
            toReturn.str += `${toReturn.years} ${unit} and `;
        }
        if(toReturn.months>0){
            const unit = toReturn.months > 1 ? "months" : "month";
            toReturn.str += `${toReturn.months} ${unit} and `;
        }
        if(toReturn.days>0){
            const unit = toReturn.days > 1 ? "days" : "day";
            toReturn.str += `${toReturn.days} ${unit} ago`;
        }
        else if(toReturn.hours>0){
            const unit = toReturn.hours > 1 ? "hours" : "hour";
            toReturn.str += `${toReturn.hours} ${unit} ago`;
        }
        else if(toReturn.minutes>=2){
            const unit = toReturn.minutes > 1 ? "minutes" : "minute";
            toReturn.str += `${toReturn.minutes} ${unit} ago`;
        }
        else if(toReturn.minutes > 0 || toReturn.seconds > 0) {
            toReturn.str += `just a minute ago`;
        }
        console.log(toReturn);
        return toReturn;
    };
    console.log("Creating DialogFlowActions instance");
    return this;
};

module.exports = DialogFlowActions;
