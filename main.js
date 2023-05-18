const i18n = require('i18n');
const yargs = require('yargs');
const yaml_config = require('yaml-config');
const config = require('yaml-config').readConfig(__dirname + "/config.yml");

const DialogFlowRobot = require('./src/dialogFlowRobot.js');

require('./force.env.js');

async function main() {
    i18n.configure({
        locales: ['en', 'fi'],
        directory: __dirname + '/locales'
    });
    // Right now code is hard coded. Will extract locale and other config options later.
    i18n.setLocale(config.locale);

    const argv = parseArgs();
    if (argv._[0] == 'zuzu1') {
        const robot = Robot.create({name: config.robot.name_for_tts});
        robot.wakeUp();
    }
    else {
        const robot = DialogFlowRobot.create({name: config.robot.name_for_tts, config: config})
        robot.wakeUp();
    }
}

function parseArgs() {
    return yargs
        .command('zuzu1', 'Zuzu gen1')
        .command('dialogflow', 'Zuzu with DialogFlow based conversation.')
        .help()
        .alias('help', 'h')
        .argv;
}



main();
