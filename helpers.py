from flask import request, abort

def get_request_json(error_code=400):
    if not request.headers['Content-Type'].startswith('application/json'):
        abort(error_code)
    return request.get_json(force=True)
