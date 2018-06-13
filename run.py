# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

import sys
from cherrypy import wsgiserver
import app
import multiprocessing
import argparse
import socket

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

if __name__ == '__main__':

    if not tryPort(8080):
        sys.exit(2)

    d = wsgiserver.WSGIPathInfoDispatcher({'/': app.DMC_APP.wsgi_app})
    server = wsgiserver.CherryPyWSGIServer(('0.0.0.0', 8080), d)

    multiprocessing.freeze_support()
    try:
        parser = argparse.ArgumentParser(description='DMC Options')
        parser.add_argument('--logLevel', type=str, nargs=1, default=["INFO"],
                            help='LogLevel can be CRITICAL/ERROR/WARNING/INFO/DEBUG')
        args = parser.parse_args()
        app.logger.setLevel(args.logLevel[0])
        deleteOldDownloadsThread = multiprocessing.Process(target=app.remove_old_downloads)
        deleteOldDownloadsThread.start()
        server.start()
    except ValueError as exception:
        print "Invalid option provided. Please use -h for help"
        sys.exit(0)
    except KeyboardInterrupt:
        print "Stopping Server..."
        deleteOldDownloadsThread.terminate()
        deleteOldDownloadsThread.join()
        server.stop()
