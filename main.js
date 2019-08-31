const Friend = require('./src/friend.js');
const Robot = require('./src/robot.js');

async function main() {
    var ebba = Friend.create({name: "Ebba"});
    var milli = Friend.create({name: "Milli"});
    var robot = Robot.create({name: "Susu"});

    await robot.greet(ebba);
    await robot.introduce_myself();
}

main();