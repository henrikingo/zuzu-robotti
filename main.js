const Friend = require('./src/friend.js');
const Robot = require('./src/robot.js');

async function main() {
    var robot = Robot.create({name: "Susu"});
    robot.wakeUp();
}

main();