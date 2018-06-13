# StorageGRID Data Management Console (DMC)

# Copyright (c) 2018, NetApp, Inc.

# Licensed under the terms of the Modified BSD License (also known as New or Revised or 3-Clause BSD)

import sys
import json
from functools import wraps
from flask import Flask, send_file, render_template, session, request
import botocore, boto3
import logging
import time
import math
import os
from config import *
from utils import *

DMC_APP = Flask(__name__, static_folder=None)
DMC_APP.secret_key = os.urandom(24)
logging.basicConfig(filename='dmc.log', level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
logging.getLogger('botocore').setLevel(logging.WARNING)
logging.getLogger('boto3').setLevel(logging.WARNING)
logging.getLogger('nose').setLevel(logging.WARNING)
logging.getLogger('werkzeug').setLevel(logging.WARNING)
logger = logging.getLogger('dmc')


def get_s3_client():
    """ Function used to create s3 client to make API calls.

    :return: dictionary containing success status and response or error message, and client if success
    """

    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=session['aws_access_key_id'],
            aws_secret_access_key=session['aws_secret_access_key'],
            endpoint_url=session['endpoint_url'],
            verify=session['verify_server_cert'],
            config=botocore.client.Config(user_agent_extra="DMC-SGWS")
        )
        return {'success': True}, s3_client
    except Exception as exception:
        logger.exception('Create s3 client: {}'.format(exception.message))
        return {"success": False, "message": exception.message, "not_authenticated": True}, None


from object_operations import *
from bucket_operations import *


def login_required(f):
    """ Decorator to check user login status.

    :param f: function to call
    :return: function to call if success
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({"not_authenticated": True})
        return f(*args, **kwargs)

    return decorated_function


@DMC_APP.route('/static/<path:filename>')
def serve_static(filename):
    """ Function used to serve static files in 'static' directory

    :param filename: name of the requested file
    :return: static file
    """

    return send_file(resource_path(os.path.join('static', filename)))


@DMC_APP.route('/downloads/<path:filename>')
@login_required
def serve_downloads(filename):
    """ Function used to serve static files in 'downloads' directory

    :param filename: name of the requested file
    :return: static file
    """

    return send_file(resource_path(os.path.join('downloads', filename)))


@DMC_APP.route("/")
def index():
    """ Root function to serve index.html file and public key.

    :return: index.html
    """
    version, build = get_version_info()
    return render_template("index.html", public_key=public_key, version=version, build=build)


@DMC_APP.route('/login', methods=['GET', 'POST'])
def login():
    """ Function used to check login status, or logging in.

    :return: dictionary containing success status and response or error message
    """

    if request.method == "GET":
        if session.get('logged_in'):
            if session['logged_in']:
                logger.info('Login status: True.')
                return jsonify({'success': True, "name": session["account_name"]})
        else:
            logger.info('Login status: False.')
            session.pop('logged_in', None)
            session.clear()
            return jsonify({'success': False, 'message': 'Session expired.', 'not_authenticated': True})
    else:
        json_data = request.json
        logger.debug("Login: request parameters - {}".format(json_data))
        access_key = json_data.get('access_key', '')
        secret_key = json_data.get('secret_key', '')
        rest_endpoint = json_data.get('rest_endpoint', '')

        inputs_to_validate = {
            'access_key': access_key,
            'secret_key': secret_key,
            'rest_endpoint': rest_endpoint
        }

        response = validate_inputs(inputs_to_validate)
        if not response['success']:
            logger.error('Login: {}'.format(response['message']))
            return jsonify(response)

        secret_key = cipher_rsa.decrypt(secret_key.decode('base64'), 'ERROR')

        if not len(access_key) == 20:
            logger.error(DMC_INVALID_ACCESS_KEY)
            return jsonify({'success': False, "message": DMC_INVALID_ACCESS_KEY})
        if not len(secret_key) == 40:
            logger.error(DMC_INVALID_SECRET_KEY)
            return jsonify({'success': False, "message": DMC_INVALID_SECRET_KEY})

        hostname_regex = re.compile(
            '^https?://(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)'
            '*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])(:[0-9]{2,5})?$')

        if not hostname_regex.match(rest_endpoint):
            logger.error(DMC_INVALID_REST_ENDPOINT)
            return jsonify({'success': False, "message": DMC_INVALID_REST_ENDPOINT})

        session['aws_access_key_id'] = access_key
        session['aws_secret_access_key'] = secret_key
        session['endpoint_url'] = rest_endpoint
        session['verify_server_cert'] = json_data.get('verify_cert', True)

        buckets_list = get_buckets()

        if buckets_list['success']:
            logger.info('Logged in successfully.')
            session['logged_in'] = True
            buckets_list = convert_date_to_strings(buckets_list)
            session["account_name"] = buckets_list['response']['Owner']['DisplayName']
            session["pagination_markers"] = []
            session["current_bucket"] = ""
            session["page"] = 1
        else:
            logger.info('Login failed.')

        return jsonify(buckets_list)


@DMC_APP.route('/logout', methods=["GET"])
def logout():
    """ Function used to log out and clear user session.

    :return: dictionary containing success status
    """

    session.pop('logged_in', None)
    session.clear()
    logger.info('Logged out successfully.')
    return jsonify({'success': True})


@DMC_APP.route("/bucket", methods=["GET", "POST"])
@login_required
def bucket_methods():
    """ Function used to get list of buckets or create new bucket.

    :return: dictionary containing success status and response or error message
    """

    if request.method == "GET":
        return jsonify(get_buckets())
    else:
        return jsonify(create_bucket(request))


@DMC_APP.route("/bucket/<bucket_name>", methods=["DELETE"])
@login_required
def delete_bucket(bucket_name):
    """ Function used to delete a bucket.

    :param bucket_name: bucket name
    :return: dictionary containing success status and response or error message
    """

    inputs_to_validate = {
        'bucket_name': bucket_name
    }
    logger.debug("Delete Bucket: request parameters - {}".format(bucket_name))

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Delete bucket: {}'.format(response['message']))
        return jsonify(response)

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    result = delete_objects_helper(bucket_name=bucket_name, client=s3_client)
    if not result['success']:
        return jsonify(result)

    params = {
        'bucket_name': bucket_name
    }

    response = s3_bucket_operations('delete_bucket', s3_client, params)
    if response['success']:
        session["current_bucket"] = ""

    return jsonify(response)


@DMC_APP.route("/delete_objects", methods=["POST"])
@login_required
def delete_objects():
    """ Function used to delete objects.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Delete Objects: request parameters - {}".format(request.json))
    bucket_name = request.json.get('bucket')
    objects = request.json.get('items')

    inputs_to_validate = {
        'bucket': bucket_name,
        'items': objects
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Delete objects: {}'.format(response['message']))
        return jsonify(response)

    to_del_obj_list = []
    prefix_list = []
    for curr_object in objects:
        if curr_object['type'] == 'file':
            to_del_obj_list.append(dict(Key=curr_object['key']))
        else:
            prefix_list.append(curr_object['key'])

    logger.debug("Delete Objects: files like objects - {}".format(to_del_obj_list))
    if to_del_obj_list:
        response = delete_objects_by_chunks(s3_client, to_del_obj_list, bucket_name)
        if not response['success']:
            return jsonify(response)

    logger.debug("Delete Objects: folder like objects - {}".format(prefix_list))
    for prefix in prefix_list:
        result = delete_objects_helper(bucket_name=bucket_name, prefix=prefix, client=s3_client)
        if not result['success']:
            return jsonify(result)

    return jsonify({'success': True, 'response': {}})


@DMC_APP.route("/list_objects", methods=["GET"])
@login_required
def list_objects():
    """ Function used to get list of objects.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("List Objects: request parameters - {}".format(request.args))

    bucket_name = request.args.get('bucketName')

    page_size = request.args.get('page_size')
    max_keys = request.args.get('marker_size')

    inputs_to_validate = {
        'bucketName': bucket_name,
        'page_size': page_size,
        'marker_size': max_keys
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('List objects: {}'.format(response['message']))
        return jsonify(response)

    breadcrumb_index = request.args.get('path_index', 0)

    int_inputs_to_validate = {
        'page_size': page_size,
        'marker_size': max_keys,
        'path_index': breadcrumb_index
    }

    response = validate_int_inputs(int_inputs_to_validate)
    if not response['success']:
        logger.error('List objects: {}'.format(response['message']))
        return jsonify(response)

    page_size = int(page_size)
    max_keys = int(max_keys)
    breadcrumb_index = int(breadcrumb_index)
    marker = request.args.get('marker', "")

    requested_marker = ""
    prefix = request.args.get('prefix', '')

    if session["current_bucket"] == "" or session["current_bucket"] != bucket_name \
            or request.args.get('refresh_markers'):
        session["current_bucket"] = bucket_name
        session["pagination_markers"] = [{"key": bucket_name, "markers": [""]}]

    session["pagination_markers"] = session["pagination_markers"][:(breadcrumb_index + 1)]

    if prefix:
        if not len(filter(lambda x: x['key'] == prefix, session["pagination_markers"])) == 1:
            session["pagination_markers"].append(
                {"key": prefix, "markers": [""]}
            )

    markers = session["pagination_markers"][breadcrumb_index]["markers"]
    logger.debug("List Objects: markers before request - {}".format(markers))
    response = {}
    try:
        if marker == "first":
            markers = [""]
        elif marker == "current":
            markers.pop()
            requested_marker = markers[-1]
        elif marker == "next":
            if not isinstance(markers[-1], bool):
                requested_marker = markers[-1]
            else:
                requested_marker = markers[-2]
        elif marker == "previous":
            if len(markers) == 2:
                markers = markers[:-1]
            elif len(markers) > 2:
                markers = markers[:-2]
            requested_marker = markers[-1]

        response = get_objects(s3_client, bucket_name, prefix, requested_marker, max_keys)

        if not response['success']:
            return jsonify(response)
        else:
            data = response['data']

        data["page_offset"] = math.ceil((float(len(markers) - 1) * max_keys) / page_size)

        data["page"] = len(markers)

        markers.append(response['marker'])

        logger.debug("List Objects: markers after request - {}".format(markers))
        session["pagination_markers"][breadcrumb_index]["markers"] = markers

        return jsonify({"success": True, "response": data})

    except Exception as exception:
        response.update({"success": False, "message": exception.message})
        logger.exception('List objects: {}'.format(exception.message))
        return jsonify(response)


@DMC_APP.route("/object", methods=["GET", "POST"])
@login_required
def object_methods():
    """ Function used to create folder like object or get metadata of the object or cut/copy paste of objects.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    if request.method == 'POST':
        action = request.json.get('action')
        bucket_name = request.json.get('bucketName')

        inputs_to_validate = {
            'action': action
        }
        response = validate_inputs(inputs_to_validate)
        if not response['success']:
            logger.error('Create folder: {}'.format(response['message']))
            return jsonify(response)

        if action == 'create_folder':
            logger.debug("Create Folder: request parameters - {}".format(request.json))
            name = request.json.get('name')

            inputs_to_validate = {
                'action': action,
                'bucketName': bucket_name,
                'name': name
            }

            response = validate_inputs(inputs_to_validate)
            if not response['success']:
                logger.error('Create folder: {}'.format(response['message']))
                return jsonify(response)

            key_prefix = request.json.get('prefix')

            if name != '/':
                name = name + '/'
            if key_prefix:
                name = "{}{}".format(key_prefix, name)

            response = check_key_existence(s3_client, bucket_name, name)
            if not response['success']:
                params = {
                    'bucket_name': bucket_name,
                    'body': '',
                    'key': name
                }

                response = s3_object_operations('create_folder', s3_client, params)
                return jsonify(response)
            else:
                message = "Folder with the same name already exists. Please provide different name."
                logger.error('Create folder: {}'.format(message))
                return jsonify({"success": False, "message": message})

        elif action == 'cut_copy_objects':
            logger.debug("Paste Objects: request parameters - {}".format(request.json))
            requested_objects = request.json.get('objects')
            operation = request.json.get('operation')
            overwrite = request.json.get('overwrite')

            inputs_to_validate = {
                'action': action,
                'objects': requested_objects,
                'bucketName': bucket_name,
                'operation': operation,
                'overwrite': overwrite
            }
            response = validate_inputs(inputs_to_validate)
            if not response['success']:
                logger.error('{} objects(s): {}'.format(operation.capitalize(), response['message']))
                return jsonify(response)

            key_prefix = request.json.get('prefix')

            for obj in requested_objects:
                name = "{}{}".format(key_prefix, obj['key']) if key_prefix else obj['key']
                response = copy_objects(s3_client, obj['bucket'], bucket_name, obj['fullkey'],
                                        name, obj['type'], overwrite)
                if not response['success']:
                    return jsonify(response)

                skip_keys = response['skipped_keys']
                if operation == 'cut':
                    if obj['type'] == 'file' and obj['fullkey'] not in skip_keys:
                        response = delete_objects_by_chunks(s3_client, [{'Key': obj['fullkey']}], obj['bucket'])
                    else:
                        response = delete_objects_helper(bucket_name=obj['bucket'], prefix=obj['fullkey'],
                                                         client=s3_client, skip_keys=skip_keys)
                    if not response['success']:
                        return jsonify(response)
            logger.info('{} objects(s) successfully completed.'.format(operation.capitalize()))
            return jsonify({'success': True})
    else:
        logger.debug("Get Metadata: request parameters - {}".format(request.args))
        bucket_name = request.args.get('bucket')
        key = request.args.get('name')

        inputs_to_validate = {
            'bucket': bucket_name,
            'name': key
        }

        response = validate_inputs(inputs_to_validate)
        if not response['success']:
            logger.error('Head object: {}'.format(response['message']))
            return jsonify(response)

        params = {
            'bucket_name': bucket_name,
            'key': key
        }
        response = s3_object_operations('head_object', s3_client, params)
        return jsonify(response)


@DMC_APP.route("/upload_file", methods=["POST"])
@login_required
def upload_file():
    """ Function used to upload single file.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Upload File: request parameters - {}".format(request.form))
    filename = request.form.get('filename')
    bucket_name = request.form.get('bucketName')
    file_to_upload = request.files.get('file')

    inputs_to_validate = {
        'filename': filename,
        'bucketName': bucket_name,
        'file': file_to_upload
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Upload file: {}'.format(response['message']))
        return jsonify(response)

    prefix = request.form.get('prefix')
    if prefix:
        filename = "{}{}".format(prefix, filename)

    response = check_key_existence(s3_client, bucket_name, filename)

    if not response['success']:
        params = {
            'bucket_name': bucket_name,
            'file': file_to_upload,
            'key': filename
        }
        response = s3_object_operations('upload_fileobj', s3_client, params)
        return jsonify(response)
    else:
        message = "File with the same name already exists."
        logger.error('Upload file: {}'.format(message))
        return jsonify({"success": False, "message": message})


@DMC_APP.route("/create_multipart_upload", methods=["GET"])
@login_required
def create_multipart_upload():
    """ Function used to initiate a multipart upload.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Create Multipart Upload: request parameters - {}".format(request.args))
    filename = request.args.get('filename')
    bucket_name = request.args.get('bucketName')

    inputs_to_validate = {
        'filename': filename,
        'bucketName': bucket_name
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Create multipart upload: {}'.format(response['message']))
        return jsonify(response)

    prefix = request.args.get('prefix')
    if prefix:
        filename = "{}{}".format(prefix, filename)

    response = check_key_existence(s3_client, bucket_name, filename)
    if not response['success']:
        params = {
            'bucket_name': bucket_name,
            'key': filename
        }
        response = s3_object_operations('create_multipart_upload', s3_client, params)
        return jsonify(response)
    else:
        message = "File with the same name already exists."
        logger.error('Create multipart upload: {}'.format(message))
        return jsonify({"success": False, "message": message})


@DMC_APP.route("/upload_part", methods=["POST"])
@login_required
def upload_part():
    """ Function used to upload a single part of a multipart upload.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Multipart Upload (Upload Part): request parameters - {}".format(request.form))
    filesize = request.form.get('contentLength')
    upload_id = request.form.get('uploadId')
    part_num = int(request.form.get('partNumber'))
    filename = request.form.get('filename')
    bucket_name = request.form.get('bucketName')

    inputs_to_validate = {
        'contentLength': filesize,
        'uploadId': upload_id,
        'partNumber': part_num,
        'filename': filename,
        'bucketName': bucket_name
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Upload part: {}'.format(response['message']))
        return jsonify(response)

    int_inputs_to_validate = {
        'partNumber': part_num
    }

    response = validate_int_inputs(int_inputs_to_validate)
    if not response['success']:
        logger.error('Upload part: {}'.format(response['message']))
        return jsonify(response)

    prefix = request.form.get('prefix')
    if prefix:
        filename = "{}{}".format(prefix, filename)

    params = {
        'bucket_name': bucket_name,
        'key': filename,
        'upload_id': upload_id,
        'part_num': part_num,
        'file': request.files['file']
    }

    response = s3_object_operations('upload_part', s3_client, params)
    if not response['success']:
        return jsonify(response)

    return jsonify({'success': True, 'response': {"PartNumber": part_num, "ETag": response['response']["ETag"]}})


@DMC_APP.route("/complete_multipart_upload", methods=["POST"])
@login_required
def complete_multipart_upload():
    """ Function used to complete a multipart upload.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Complete Multipart Upload: request parameters - {}".format(request.json))
    upload_id = request.json.get('uploadId')
    parts = request.json.get('parts')
    filename = request.json.get('filename')
    bucket_name = request.json.get('bucketName')

    inputs_to_validate = {
        'uploadId': upload_id,
        'parts': parts,
        'filename': filename,
        'bucketName': bucket_name
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Complete multipart upload: {}'.format(response['message']))
        return jsonify(response)

    prefix = request.json.get('prefix')

    if prefix:
        filename = "{}{}".format(prefix, filename)

    params = {
        'bucket_name': bucket_name,
        'key': filename,
        'upload_id': upload_id,
        'parts': {"Parts": parts}
    }
    response = s3_object_operations('complete_multipart_upload', s3_client, params)
    return jsonify(response)


@DMC_APP.route("/cancel_multipart_upload", methods=["POST"])
@login_required
def cancel_multipart_upload():
    """ Function used to cancel a multipart upload.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Cancel Multipart Upload: request parameters - {}".format(request.json))
    upload_id = request.json.get('uploadId')
    filename = request.json.get('filename')
    bucket_name = request.json.get('bucketName')

    inputs_to_validate = {
        'uploadId': upload_id,
        'filename': filename,
        'bucketName': bucket_name
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Cancel multipart upload: {}'.format(response['message']))
        return jsonify(response)

    prefix = request.json.get('prefix')
    if prefix:
        filename = "{}{}".format(prefix, filename)

    params = {
        'bucket_name': bucket_name,
        'key': filename,
        'upload_id': upload_id
    }
    response = s3_object_operations('abort_multipart_upload', s3_client, params)
    return jsonify(response)


@DMC_APP.route("/download", methods=["GET"])
@login_required
def download_objects():
    """ Function used to download objects.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Download Files: request parameters - {}".format(request.args))
    bucket_name = request.args.get('bucket')
    objects = request.args.get('items')

    inputs_to_validate = {
        'bucket': bucket_name,
        'items': objects
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Download files: {}'.format(response['message']))
        return jsonify(response)

    objects = json.loads(objects)

    url_list = []
    for curr_object in objects:
        if curr_object['type'] == 'file':
            params = {
                'method': 'get_object',
                'params': {'Bucket': bucket_name, 'Key': curr_object['key']},
                'http_method': 'GET'
            }
            response = s3_object_operations('generate_presigned_url', s3_client, params)

        else:
            params = {
                'Bucket': bucket_name,
                'key': curr_object['key']
            }
            response = s3_object_operations('generate_folder_url', s3_client, params)

        if not response['success']:
            return jsonify(response)

        url_list.append(response['response'])

    return jsonify({'success': True, 'response': {'download_urls': url_list}})


@DMC_APP.route("/rename_object", methods=["POST"])
@login_required
def rename_object():
    """ Function used to rename a object.

    :return: dictionary containing success status and response or error message
    """

    response, s3_client = get_s3_client()

    if not response['success']:
        return jsonify(response)

    logger.debug("Rename Object: request parameters - {}".format(request.json))
    bucket_name = request.json.get('bucketName')
    old_key = request.json.get('old_key')
    new_key = request.json.get('new_key')
    object_type = request.json.get('type')

    inputs_to_validate = {
        'old_key': old_key,
        'new_key': new_key,
        'bucketName': bucket_name,
        'type': object_type
    }

    response = validate_inputs(inputs_to_validate)
    if not response['success']:
        logger.error('Rename Object: {}'.format(response['message']))
        return jsonify(response)

    prefix = request.json.get('prefix')
    if prefix:
        new_key = "{}{}".format(prefix, new_key)

    if object_type == 'dir' and new_key[-1] != '/':
        new_key = "{}/".format(new_key)

    response = copy_objects(s3_client, bucket_name, bucket_name, old_key, new_key, object_type, False)
    if not response['success']:
        return jsonify(response)
    elif response.get('key_exists'):
        message = "Folder name already exists." if object_type == 'dir' else "File name already exists."
        return jsonify({'success': False, 'message': message})

    if object_type == 'dir':
        response = delete_objects_helper(bucket_name=bucket_name, prefix=old_key, client=s3_client,
                                         not_to_del_prefix=new_key)
        if not response['success']:
            return jsonify(response)

    else:
        response = delete_objects_by_chunks(s3_client, [{'Key': old_key}], bucket_name)
        if not response['success']:
            return jsonify(response)

    logger.info('Renamed object successfully.')
    return jsonify({'success': True})


def remove_old_downloads():
    """ Function used to delete old downloaded folder's zip files in background.
    """

    logger.debug('Scheduled task initiated')
    while True:
        try:
            time.sleep(30)
            for d in os.listdir(os.path.join(resource_path('downloads'))):
                last_modified = int(os.path.getmtime(os.path.join(resource_path('downloads'), d)))
                current_time = int(time.time())
                if current_time >= last_modified + 60 * 60:
                    logger.debug('Deleting "{}"'.format(os.path.join(resource_path('downloads'), d)))
                    if os.path.isfile(os.path.join(resource_path('downloads'), d)):
                        os.remove(os.path.join(resource_path('downloads'), d))
                    else:
                        shutil.rmtree(os.path.join(resource_path('downloads'), d))
        except Exception as e:
            logger.exception('Scheduled task exited')
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    DMC_APP.run()
