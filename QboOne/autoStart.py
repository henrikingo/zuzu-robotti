#!/usr/bin/env python2.7

# I use this script on the Qbo One. It is based on the script that comes with the Qbo itself at the
# same location: /home/pi/Documents/deamonsScripts/autoStart.py
import time
import fileinput
import sys
import os
import errno
import yaml
import subprocess

# read config file
config = yaml.safe_load(open("/home/pi/Documents/config.yml"))
print "CONFIG " + str(config)

text = "Please Wait while I synchronize my clock"
speak = "pico2wave -l \"en-US\" -w /home/pi/Documents/pico2wave.wav \"<volume level='" + str(config["volume"]) + "'>" + text + "\" && aplay -D convertQBO /home/pi/Documents/pico2wave.wav"
result = subprocess.call(speak, shell = True)
time.sleep(0.5)
subprocess.call("until [ $(systemctl status systemd-timesyncd.service|grep Synchronized|wc -l) -ne 0 ]; do sleep 1; done", shell = True)
subprocess.call("systemctl status systemd-timesyncd.service|grep Synchronized|wc -l > /home/pi/zuzu-synced.log", shell = True)


text = "Now starting Zuzu"
speak = "pico2wave -l \"en-US\" -w /home/pi/Documents/pico2wave.wav \"<volume level='" + str(config["volume"]) + "'>" + text + "\" && aplay -D convertQBO /home/pi/Documents/pico2wave.wav"
result = subprocess.call(speak, shell = True)
subprocess.call("GOOGLE_APPLICATION_CREDENTIALS=/home/pi/Zuzu-e437619bd892.json /home/pi/.nvm/versions/node/v13.13.0/bin/node /home/pi/Documents/zuzu-robotti/main.js > /home/pi/zuzu.log 2>&1", shell = True)


text = "Stopped"
speak = "pico2wave -l \"en-US\" -w /home/pi/Documents/pico2wave.wav \"<volume level='" + str(config["volume"]) + "'>" + text + "\" && aplay -D convertQBO /home/pi/Documents/pico2wave.wav"
subprocess.call(speak, shell = True)


sys.exit()

