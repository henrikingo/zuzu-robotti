const i18n = require('i18n');

const Friend = require('./src/friend.js');
const Robot = require('./src/robot.js');



async function main() {
    i18n.configure({
        locales: ['en', 'fi'],
        directory: __dirname + '/locales'
    });
    // Right now code is hard coded. Will extract locale and other config options later.
    i18n.setLocale('en');

    var robot = Robot.create({name: "Susu"});
    robot.wakeUp();
}

main();
