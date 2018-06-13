# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

from constants import *
import sys
import os


# Define function to import external files when using PyInstaller.
def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """

    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)


def validate_inputs(inputs):
    """ Function used to validate input parameter existence.

    :param inputs: dictionary containing input key(s) and value(s)
    :return: dictionary containing success status and response or error message
    """

    response = {'success': True}
    invalid = []
    for key, value in inputs.iteritems():
        if not str(value):
            invalid.append(key)

    if len(invalid) > 0:
        response.update({
            'success': False,
            'message': DMC_MISSING_PARAMS.format(', '.join(invalid))
        })

    return response


def validate_int_inputs(inputs):
    """ Function used to validate integer input parameter.

    :param inputs: dictionary containing input key(s) and value(s)
    :return: dictionary containing success status and response or error message
    """

    response = {'success': True}
    try:
        if not sum(1 for key, curr_input in inputs.iteritems() if int(curr_input) >= 0) == len(inputs.keys()):
            response['success'] = False
    except (TypeError, ValueError) as e:
        response['success'] = False

    if not response['success']:
        response.update({
            'message': DMC_INT_TYPE_CAST_ERROR.format(', '.join(inputs.keys()))
        })

    return response


def get_version_info():
    """ Function used to return version information by reading dmc.version file.

    :return: version, build number
    """

    version = ''
    build = ''

    try:
        info = ""
        with open(resource_path('dmc.version'), 'r') as f:
            info = f.read().split('\n')
        version = info[0].split('=')[1]
        build = info[1].split('=')[1]
    except (OSError, IOError) as e:
        pass

    return version, build
