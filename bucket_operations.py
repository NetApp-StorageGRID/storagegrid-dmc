# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

import re
from app import logger
from app import get_s3_client
from utils import *
from flask import jsonify
import botocore


def create_bucket(req):
    """ Function used to create bucket.

    :param req: request object
    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return response

    logger.debug("Create Bucket: request parameters - {}".format(req.json))
    bucket_name = req.json.get('name')
    inputs_to_validate = {
        'bucket_name': bucket_name
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Create bucket: {}'.format(response['message']))
        return jsonify(response)

    rules = [
        {
            'regex': re.compile('^[a-z0-9.\-]{3,63}$'),
            'message': 'rule1',
            'check': False
        },
        {
            'regex': re.compile('^[a-z0-9]'),
            'message': 'rule2',
            'check': False
        },
        {
            'regex': re.compile('^.*(\-\.|\.\-).*$'),
            'message': 'rule3',
            'check': True
        },
        {
            'regex': re.compile('.*(\.{2}).*$'),
            'message': 'rule4',
            'check': True
        },
        {
            'regex': re.compile('.*[-.]$'),
            'message': 'rule5',
            'check': True
        },
        {
            'regex': re.compile('^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'),
            'message': 'rule6',
            'check': True
        }
    ]

    for rule in rules:
        if bool(rule['regex'].match(bucket_name)) == rule['check']:
            logger.error('Create bucket: {}'.format(DMC_BUCKET_NAME_RULES[rule['message']]))
            return {'success': False, 'message': DMC_BUCKET_NAME_RULES[rule['message']]}

    params = {
        'bucket_name': bucket_name
    }

    response = s3_bucket_operations('create_bucket', s3_client, params)
    return response


def get_buckets():
    """ Function used to retrieve list of buckets.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return response

    response = s3_bucket_operations('list_buckets', s3_client, None)
    return response


def s3_bucket_operations(operation, client, params):
    """ Common functions to perform operations on a bucket.

    :param operation: name of the operation
    :param client: s3 client
    :param params: parameters for the request
    :return: dictionary containing success status and response or error message
    """

    logger.debug("Bucket Operation '{}' : API parameters - {}".format(operation, params))
    try:
        if operation == "list_buckets":
            response = client.list_buckets()
            return {'success': True, 'response': response}

        elif operation == "create_bucket":
            response = client.create_bucket(Bucket=params['bucket_name'])
            logger.info('Bucket "{}" created successfully'.format(params['bucket_name']))
            return {'success': True, 'response': response}

        elif operation == "delete_bucket":
            response = client.delete_bucket(Bucket=params['bucket_name'])
            logger.info('Bucket "{}" deleted successfully'.format(params['bucket_name']))
            return {'success': True, 'response': response}

    except botocore.exceptions.ClientError as e:
        code = e.response['Error']['Code']
        message = DMC_BOTO_EXCEPTIONS.get(code, e.message)
        logger.exception('{}: {}'.format(operation, message))

        response = {'success': False, 'message': message}
        if code in ["InvalidAccessKeyId", "SignatureDoesNotMatch"]:
            response.update({'not_authenticated': True})

        return response

    except botocore.vendored.requests.exceptions.SSLError as e:
        logger.exception('{}: {}'.format(operation, DMC_BOTO_EXCEPTIONS['SSLError']))
        return {'success': False, 'message': DMC_BOTO_EXCEPTIONS['SSLError']}
    except botocore.vendored.requests.exceptions.ConnectionError as e:
        logger.exception('{}: {}'.format(operation, DMC_BOTO_EXCEPTIONS['ConnectionError']))
        return {'success': False, 'message': DMC_BOTO_EXCEPTIONS['ConnectionError']}
    except botocore.exceptions.ParamValidationError as e:
        logger.exception('{}: {}'.format(operation, e.message))
        return {'success': False, 'message': e.message}
    except Exception as e:
        logger.exception('{}: {}'.format(operation, e.message))
        return {'success': False, 'message': e.message}


def convert_date_to_strings(obj):
    """ Function used to convert date objects to string.

    :param obj: object
    :return: object with date objects converted to strings
    """

    for bucket in obj.get('response', {}).get('Buckets', []):
        bucket["CreationDate"] = str(bucket["CreationDate"])

    return obj
