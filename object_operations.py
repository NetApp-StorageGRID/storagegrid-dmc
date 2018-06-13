# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

import shutil
import os
import urllib
from app import logger
from app import resource_path
from constants import *
import botocore


def zipdir(path, bucket_name, filename):
    """ Function used to create zip of a directory.

    :param path: source directory path
    :param bucket_name: name of the bucket from which the folder object is downloaded
    :param filename: name of zip file
    :return: True if archived successfully, False otherwise
    """

    try:
        shutil.make_archive(base_name=resource_path(os.path.join('downloads', bucket_name, filename[:-1])),
                            format='zip', root_dir=path)
        return True
    except Exception as e:
        logger.exception('{}: {}'.format("Download", e.message))
    return False


def download_dir(client, prefix, local, bucket):
    """ Function used to download all objects of a folder.

    :param client: s3 client
    :param prefix: folder prefix
    :param local: local path to download objects
    :param bucket: name of the bucket from which the folder object is downloaded
    :return: True if successful, False otherwise
    """

    try:
        params = {
            'method': 'list_objects',
            'bucket_name': bucket,
            'prefix': prefix
        }
        response = s3_object_operations('get_paginator', client, params)
        if not response['success']:
            return False

        for result in response['response']:
            for obj in result.get('Contents', []):
                if not os.path.exists(os.path.dirname(os.path.join(local, obj.get('Key')))):
                    logger.debug('Creating path : {}'.format(os.path.dirname(os.path.join(local, obj.get('Key')))))
                    os.makedirs(os.path.dirname(os.path.join(local, obj.get('Key'))))
                if not obj.get('Key')[-1] == '/':
                    response = s3_object_operations('download_file', client,
                                                    {'bucket': bucket, 'key': obj.get('Key'),
                                                     'path': local + os.sep + obj.get('Key')})
                    if not response['success']:
                        return False

    except Exception as e:
        logger.exception('Download S3 folder')
        return False
    return True


def s3_object_operations(operation, client, params):
    """ Common functions to perform operations on bucket objects.

    :param operation: name of the operation
    :param client: s3 client
    :param params: parameters for the request
    :return: dictionary containing success status and response or error message
    """

    logger.debug("Object Operation '{}' : API parameters - {}".format(operation, params))
    try:
        if operation == "get_paginator":
            paginator = client.get_paginator(params['method'])
            if params['prefix']:
                response = paginator.paginate(Bucket=params['bucket_name'], Prefix=params['prefix'])
            else:
                response = paginator.paginate(Bucket=params['bucket_name'])
            return {'success': True, 'response': response}

        elif operation == "delete_objects":
            response = client.delete_objects(Bucket=params['bucket_name'], Delete=params['object_list'])
            return {'success': True, 'response': response}

        elif operation == "list_objects":
            response = client.list_objects(
                Bucket=params['bucket_name'],
                Prefix=params['prefix'],
                Delimiter=params['delimiter'],
                Marker=params['marker'],
                MaxKeys=params['max_keys']
            )
            return {'success': True, 'response': response}

        elif operation == "create_folder":
            response = client.put_object(Bucket=params['bucket_name'], Key=params['key'], Body=params['body'])
            logger.info('Folder "{}" created successfully'.format(params['key']))
            return {'success': True, 'response': response}

        elif operation == "upload_fileobj":
            response = client.upload_fileobj(
                Fileobj=params['file'], Bucket=params['bucket_name'], Key=params['key']
            )
            logger.info('File "{}" uploaded successfully'.format(params['key']))
            return {'success': True, 'response': response}

        elif operation == "create_multipart_upload":
            response = client.create_multipart_upload(Bucket=params['bucket_name'], Key=params['key'])
            logger.info('Multipart upload for "{}" initiated successfully'.format(params['key']))
            return {'success': True, 'response': response}

        elif operation == "upload_part":
            logger.debug("Uploading Part: {} of {}({})".format(params['part_num'], params['key'], params['upload_id']))
            response = client.upload_part(
                Body=params['file'],
                Bucket=params['bucket_name'],
                Key=params['key'],
                UploadId=params['upload_id'],
                PartNumber=params['part_num']
            )
            return {'success': True, 'response': response}

        elif operation == "complete_multipart_upload":
            response = client.complete_multipart_upload(
                Bucket=params['bucket_name'],
                Key=params['key'],
                UploadId=params['upload_id'],
                MultipartUpload=params['parts']
            )
            logger.info('Multipart upload for "{}" completed successfully'.format(params['key']))
            return {'success': True, 'response': response}

        elif operation == "abort_multipart_upload":
            response = client.abort_multipart_upload(
                Bucket=params['bucket_name'],
                Key=params['key'],
                UploadId=params['upload_id']
            )
            logger.info('Multipart upload for "{}" cancelled successfully'.format(params['key']))
            return {'success': True, 'response': response}

        elif operation == "generate_presigned_url":
            response = client.generate_presigned_url(
                params['method'], Params=params['params'], HttpMethod=params['http_method']
            )
            return {'success': True, 'response': {'download_as': params['params']['Key'], 'link': response}}

        elif operation == 'generate_folder_url':
            if download_dir(client, params['key'], resource_path('downloads') + os.sep + params['Bucket'],
                            params['Bucket']):
                # compress folder
                logger.debug('Folder "{}" downloaded from S3'.format(params['key']))
                if zipdir(os.path.join(resource_path('downloads'), params['Bucket'], params['key']),
                          params['Bucket'], params['key']):
                    # delete folder
                    logger.info('Folder "{}" downloaded as zip from S3'.format(params['key']))
                    shutil.rmtree(os.path.join(resource_path('downloads'), params['Bucket'], params['key']), True)
                    response = {
                        'download_as': params['key'].split('/')[-2],
                        'link': os.path.join("downloads", params['Bucket'], urllib.quote(params['key'][:-1]) + '.zip')
                    }

                return {'success': True, 'response': response}

            return {'success': False, 'message': DMC_DOWNLOAD_FOLDER_FAILED.format(params['key'])}

        elif operation == "download_file":
            response = client.download_file(params['bucket'], params['key'], params['path'])
            return {'success': True, 'response': response}

        elif operation == "copy_object":
            response = client.copy_object(
                Bucket=params['bucket_name'], CopySource=params['copy_source'], Key=params['key']
            )
            return {'success': True, 'response': response}

        elif operation == "head_object":
            response = client.head_object(Bucket=params['bucket_name'], Key=params['key'])
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


def delete_objects_helper(bucket_name=None, prefix=None, client=None, not_to_del_prefix=None, skip_keys=None):
    """ Helper function to create list of keys to delete and call delete operation with the list.

    :param bucket_name: bucket name
    :param prefix: prefix
    :param client: s3 client
    :param not_to_del_prefix: prefix of keys to not delete
    :param skip_keys: list of keys to not delete
    :return: dictionary containing success status and response or error message
    """

    params = {
        'method': 'list_objects',
        'bucket_name': bucket_name,
        'prefix': prefix
    }
    response = s3_object_operations('get_paginator', client, params)

    if not response['success']:
        return response

    to_del_obj_list = []

    if not skip_keys:
        skip_keys = []

    for item in response['response'].search('Contents'):
        if item:
            if not (not_to_del_prefix and item['Key'].startswith(not_to_del_prefix)) and item['Key'] not in skip_keys:
                to_del_obj_list.append(dict(Key=item['Key']))

        if len(to_del_obj_list) == 1000:
            response = delete_objects_by_chunks(client, to_del_obj_list, bucket_name)
            if not response['success']:
                return response
            to_del_obj_list = []

    if len(to_del_obj_list):
        response = delete_objects_by_chunks(client, to_del_obj_list, bucket_name)
        if not response['success']:
            return response

    return {'success': True}


def delete_objects_by_chunks(client, to_del_obj_list, bucket_name):
    """ Function used to delete list of keys.

    :param client: s3 client
    :param to_del_obj_list: list of keys to delete
    :param bucket_name: bucket name
    :return: dictionary containing success status and response or error message
    """

    while True:
        if not len(to_del_obj_list) > 1000:
            params = {
                'bucket_name': bucket_name,
                'object_list': {'Objects': to_del_obj_list}
            }

            response = s3_object_operations('delete_objects', client, params)
            if not response['success']:
                return response

            del to_del_obj_list[:1000]
            break

        else:
            params = {
                'bucket_name': bucket_name,
                'object_list': {'Objects': to_del_obj_list[:1000]}
            }
            response = s3_object_operations('delete_objects', client, params)
            if not response['success']:
                return response

            del to_del_obj_list['Objects'][:1000]

    return {"success": True}


def get_objects(client, bucket_name, prefix, marker, max_keys):
    """ Function used to get list of objects recursively with user defined limit.

    :param client: s3 client
    :param bucket_name: bucket name
    :param prefix: prefix
    :param marker: marker after which the objects will be retrieved
    :param max_keys: limit of objects to get
    :return: dictionary containing success status and response with next marker or error message
    """

    total_keys = max_keys
    contents = []
    common_prefixes = []

    while True:
        if total_keys > 1000:
            max_keys = 1000
            total_keys -= 1000
        else:
            max_keys = total_keys
            total_keys = 0

        params = {
            'bucket_name': bucket_name,
            'prefix': prefix,
            'delimiter': '/',
            'marker': marker,
            'max_keys': max_keys
        }
        response = s3_object_operations('list_objects', client, params)
        if not response['success']:
            return response

        data = response['response']

        contents = contents + data.get('Contents', [])
        common_prefixes = common_prefixes + data.get('CommonPrefixes', [])

        if data["IsTruncated"]:
            marker = data["NextMarker"]
        else:
            data.update({'Contents': contents, 'CommonPrefixes': common_prefixes})
            return {'success': True, 'data': data, 'marker': True}

        if total_keys == 0:
            data.update({'Contents': contents, 'CommonPrefixes': common_prefixes})
            return {'success': True, 'data': data, 'marker': marker}


def copy_objects(client, source_bucket, target_bucket, old_key, new_key, obj_type, overwrite):
    """ Function used to copy objects.

    :param client: s3 client
    :param source_bucket: source bucket
    :param target_bucket: target bucket
    :param old_key: old key
    :param new_key: new key
    :param obj_type: type 'dir' or 'file'
    :param overwrite: overwrite or not to overwrite a object if exists (boolean)
    :return: dictionary containing success status and response or error message
    """

    skipped_keys = []

    if obj_type == 'dir':
        params = {
            'method': 'list_objects',
            'bucket_name': source_bucket,
            'prefix': old_key
        }
        response = s3_object_operations('get_paginator', client, params)
        if not response['success']:
            return response

        for page in response['response']:
            contents = page.get('Contents', [])
            for item in contents:
                key = item['Key']
                renamed_key = key.replace(old_key, new_key, 1)

                params = {
                    'bucket_name': target_bucket,
                    'copy_source': {'Bucket': source_bucket, 'Key': key},
                    'key': renamed_key
                }
                if not overwrite:
                    response = check_key_existence(client, target_bucket, renamed_key)
                    if response['success']:
                        skipped_keys.append(key)
                        continue
                response = s3_object_operations('copy_object', client, params)
                if not response['success']:
                    return response

        return {'success': True, 'skipped_keys': skipped_keys}

    else:
        params = {
            'bucket_name': target_bucket,
            'copy_source': {'Bucket': source_bucket, 'Key': old_key},
            'key': new_key
        }
        if not overwrite:
            response = check_key_existence(client, target_bucket, new_key)
            if response['success']:
                skipped_keys.append(old_key)
                return {'success': True, 'skipped_keys': skipped_keys}
        response = s3_object_operations('copy_object', client, params)
        if not response['success']:
            return response

        return {'success': True, 'skipped_keys': skipped_keys}


def check_key_existence(client, bucket_name, key):
    """ Function used to check if a key exists in bucket or not.

    :param client: s3 client
    :param bucket_name: bucket name
    :param key: key
    :return: dictionary containing response of head_object operation with success status and response or error message
    """
    params = {
        'bucket_name': bucket_name,
        'key': key
    }
    response = s3_object_operations('head_object', client, params)
    return response
