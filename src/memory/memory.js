
///// Implement a simple memory that just keeps events in RAM in a JS array
/*

zuzuEvent is of the form

{
type: "friend", // type of event
name: "Henrik", // The name of a friend or object
time: Date(),   // A Date() object that is the timestamp of the event
}




 */

function Memory(robot, config) {
    this.allEvents = [];
    const memory = this;

    this.addEvent = function (zuzuEvent) {
        this.allEvents.push(zuzuEvent);
    };

    this.getLatestEvent = function() {
        if(this.allEvents.length>0){
            return this.allEvents[this.allEvents.length-1];
        }
        return null;
    };

    this.getLatestEventOfType = function(type) {
        for(zuzuEvent of this.allEvents){
            if (zuzuEvent.type !== undefined && zuzuEvent.type == type) {
                return zuzuEvent;
            }
        }
        return null;
    };

    this.getEventsByName = function(name) {
        let friendEvents = [];
        for(zuzuEvent of this.allEvents){
            if (zuzuEvent.name !== undefined && zuzuEvent.name == name) {
                friendEvents.push(zuzuEvent);
            }
        }
        return friendEvents;
    };

    this.lastSeen = function(name) {
        const events = this.getEventsByName(name);
        if(events)
            return events.pop();
    };

    this.dump = function(){
        console.log("Dump all memory.");
        console.log(memory.allEvents);
    };

    return this;
}


module.exports.create = function (robot, config) {return new Memory(robot, config);};
