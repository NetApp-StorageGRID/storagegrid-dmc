# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

from __future__ import print_function
from string import Template
import argparse
import sys
import os
import shutil
from collections import namedtuple

# python2 only module, use subprocess for python3
import commands
import socket

BIN_NAME = "dmc_mac"
FOLDER_NAME = "bin"  # the location inside MEI tempfolder where the binary has to be kept
LABEL = "storage-dmc"  # used to start the service
AGENT_FILE_LOCATION = "/Library/LaunchDaemons/{}.plist".format(LABEL)

REMOTE_FILE_LOCATION = "~/.dmc_service"
TEMPLATE = \
    """
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
        <key>Label</key>
        <string>${LABEL}</string>
        <key>Program</key>
        <string>${location}/${bin_name}</string>
        <key>ProgramArguments</key>
        <array>
        <string>${location}/${bin_name}</string>
        <string>--logLevel</string>
        <string>${logLevel}</string>
        </array>
        <key>RunAtLoad</key>
        <true/>
        <key>WorkingDirectory</key>
        <string>${location}</string>
        <key>StandardOutPath</key>
        <string>${location}/${bin_name}.stdout</string>
        <key>StandardErrorPath</key>
        <string>${location}/${bin_name}.stderr</string>
        <key>KeepAlive</key>
        <dict>
        <key>Crashed</key>
        <true/>
        </dict>
        </dict>
        </plist>
        """


# Define function to import external files when using PyInstaller.
def resource_path():
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
        print(base_path)
    except Exception:
        base_path = os.path.abspath(".")

    return base_path


# for dev purposes
def parse_arguments():
    parser = argparse.ArgumentParser(description="A script to install and start dmc service")

    parser.add_argument('--logLevel', type=str, nargs=1, default=["INFO"],
                        choices=('CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'),
                        help='LogLevel can be CRITICAL/ERROR/WARNING/INFO/DEBUG')

    parser.add_argument('action', type=str, nargs='?', choices=('start', 'stop', 'restart'),
                        default="start", help='To start, stop or restart the DMC service')

    return parser.parse_args()


def start_service(args):
    base_location = resource_path()
    tpl = Template(TEMPLATE)

    current_binary_location = os.path.expanduser(os.path.join(base_location, FOLDER_NAME, BIN_NAME))
    remote_binary_location = os.path.expanduser(REMOTE_FILE_LOCATION)

    try:
        os.makedirs(remote_binary_location)
    except OSError as e:
        if e.errno == 17:
            print("DMC service is already running.")
            print("Please try 'restart' option to restart DMC service with command.")
            print("Usage: ./dmc_mac_service [start|stop|restart]")
        else:
            print(e.strerror)
        sys.exit(2)
    except Exception as e:
        print("Technical error. Please contact administrator.")
        print(e)
        sys.exit(2)

    remote_binary_location_file = os.path.join(remote_binary_location, BIN_NAME)
    try:
        agent_service_file = open(os.path.expanduser(AGENT_FILE_LOCATION), "w")
        agent_service_file.write(tpl.safe_substitute(
            location=remote_binary_location, LABEL=LABEL, bin_name=BIN_NAME, logLevel=args.logLevel[0]))
        agent_service_file.flush()
    except Exception as e:
        print("Cannot open the service file at", AGENT_FILE_LOCATION, file=sys.stderr)
        print(e)
        sys.exit(2)

    # using copy2 to copy the binary file (with metadata intact)
    # to the user specified location
    try:
        shutil.copy2(current_binary_location, remote_binary_location_file)
    except IOError as e:
        if e.errno == 26:
            print("DMC service is already running.")
            print("Please try 'restart' option to restart DMC service with command.")
            print("Usage: ./dmc_mac_service [start|stop|restart]")
        else:
            print(e.strerror)
        sys.exit(2)
    except Exception as e:
        print("Technical error. Please contact administrator.")
        print(e)
        sys.exit(2)

    print(commands.getoutput("launchctl load -w {}".format(AGENT_FILE_LOCATION)))
    print(commands.getoutput("launchctl start {}".format(LABEL)))
    print("DMC service started")


def stop_service():
    commands.getoutput("launchctl stop {}".format(AGENT_FILE_LOCATION))
    commands.getoutput("launchctl unload {}".format(AGENT_FILE_LOCATION))
    commands.getoutput("rm -rf {}".format(AGENT_FILE_LOCATION))
    commands.getoutput("rm -rf {}".format(REMOTE_FILE_LOCATION))
    print("DMC service stopped")

def tryPort(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = False
    try:
        sock.bind(("0.0.0.0", port))
        result = True
    except:
        print("Port 8080 is already in use")
    sock.close()
    return result

if __name__ == "__main__":
    args = parse_arguments()

    if not os.geteuid() == 0:
        print("This command must be run as root user.")
        sys.exit(2)

    if args.action in ('start', 'restart') and not tryPort(8080):
        sys.exit(2)
        
    if args.action == 'stop':
        stop_service()
    elif args.action == 'start':
        start_service(args)
    elif args.action == 'restart':
        stop_service()
        start_service(args)
