
///// Implement a persistent memory using Datastax Document API
/*

zuzuEvent is of the form

{
type: "friend", // type of event
name: "Henrik", // The name of a friend or object
time: Date(),   // A Date() object that is the timestamp of the event
}




 */

function Memory(robot, config) {
    const memory = this;

    const { createClient } = require("@astrajs/rest");

    const astraKeyspace = process.env.ASTRA_DB_KEYSPACE;
    const astraCollection = "zuzuCollection";
    const basePath = `/api/rest/v2/namespaces/${astraKeyspace}/collections/${astraCollection}`;
    let astraClient = null;

    this._astra = async function () {
        console.log(process.env);
        if(astraClient) return astraClient;

        // create an Astra DB client
        astraClient = await createClient({
            astraDatabaseId: process.env.ASTRA_DB_ID,
            astraDatabaseRegion: process.env.ASTRA_DB_REGION,
            applicationToken: process.env.ASTRA_DB_APPLICATION_TOKEN,
        });
        // Will log your application token!!!
        console.log(astraClient);
        return astraClient;
    };

    this.addEvent = async function (zuzuEvent) {
        console.log(memory._makeKey(zuzuEvent.time));
        (await memory._astra()).put(basePath + "/" + memory._makeKey(zuzuEvent.time), zuzuEvent)
            .catch(memory._astraErrorHandler);
    };

    this.getLatestEvent = async function() {
        // Believe it or not, by default the latest inserted document is returned, says Stargate documentation.
        // How does it know???
        const { data, status } = await (await memory._astra()).get(basePath);
        console.log(status);
        return data;
    };

    this.getLatestEventOfType = async function(type) {
        const { data, status } = await (await memory._astra()).get(basePath, {
          params: {
            where: {
              type: { $eq: type },
            },
          },
        });
        console.log(status);
        return data;
    };

    this.getEventsByName = async function(name) {
        const { data, status } = await (await memory._astra()).get(basePath + "?page-size=10", {
          params: {
            where: {
              name: { $eq: name },
            },
          },
        });
        console.log(status);

        let friendEvents = [];
        let sortedKeys = [];
        for(key in data){
            sortedKeys.push(key);
        }
        sortedKeys.sort();
        for(key of sortedKeys){
            friendEvents.push(memory._fixTypes(data[key]));
        }
        return friendEvents;
    };

    this.lastSeen = async function(name) {
        const events = await this.getEventsByName(name);
        console.log(events);
        if(events)
            return events.pop();
    };

    this.dump = async function(){
        console.log("Dump all memory.");
        const { data, status } = await (await memory._astra()).get(basePath + "?page-size=10");
        console.log(status);
        // console.log(data);

        let events = [];
        let sortedKeys = [];
        for(key in data){
            sortedKeys.push(key);
        }
        sortedKeys.sort();
        for(key of sortedKeys){
            events.push(data[key]);
        }
        console.log(events);
    };

    this._astraErrorHandler = function(status){
        console.warn("Astra Document API method failed.");
        console.warn(status);
    };

    this._fixTypes = function(zuzuEvent){
        if(typeof zuzuEvent.time == "string")
            zuzuEvent.time = new Date(zuzuEvent.time);
        return zuzuEvent;
    };

    this._makeKey = function(date){
        let dateStr = "ts" + date.toISOString();
        return dateStr.replace(".", "").replace(":", "").replace("-", "").replace(".", "").replace(":", "").replace("-", "").replace(".", "").replace(":", "").replace("-", "").replace(".", "").replace(":", "").replace("-", "").replace(".", "").replace(":", "").replace("-", "").replace(".", "").replace(":", "").replace("-", "");

        return dateStr.replaceAll(".", "").replaceAll(":", "").replaceAll("-", "");
        return dateStr;
    };

    return this;
}


module.exports.create = function (robot, config) {return new Memory(robot, config);};
